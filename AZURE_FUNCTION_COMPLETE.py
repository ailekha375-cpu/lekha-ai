import os
import json
import uuid
import base64
import datetime
import logging
from typing import Any, Dict, List, Optional

import azure.functions as func
import requests
from openai import OpenAI

from azure.cosmos import CosmosClient
from azure.storage.blob import BlobServiceClient, ContentSettings

import firebase_admin
from firebase_admin import credentials, auth


# ----------------------------
# App + Routes (Python v2)
# ----------------------------
app = func.FunctionApp(http_auth_level=func.AuthLevel.ANONYMOUS)

# ----------------------------
# Config
# ----------------------------
SYSTEM_PROMPT = """You are a router for a chatbot.
Return ONLY valid JSON with keys:
- intent: "chat" | "create_invitation"
- response: string (only if intent="chat")
- prompt_for_model: string (only if intent="create_invitation")

Rules:
- If the user asks to generate or create an invitation image, use intent="create_invitation".
- Otherwise, use intent="chat".
"""

HISTORY_LIMIT = 20
AZURE_ML_TIMEOUT_SECONDS = 120


# ----------------------------
# Env vars (match your local.settings.json)
# ----------------------------
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")

COSMOS_URL = os.environ.get("COSMOS_URL", "")
COSMOS_KEY = os.environ.get("COSMOS_KEY", "")
COSMOS_DB_NAME = os.environ.get("COSMOS_DB_NAME", "lekha-db1")
COSMOS_CONTAINER_CONVERSATIONS = os.environ.get("COSMOS_CONTAINER_CONVERSATIONS", "conversations")
COSMOS_CONTAINER_MESSAGES = os.environ.get("COSMOS_CONTAINER_MESSAGES", "messages")

AZURE_ML_ENDPOINT = os.environ.get("AZURE_ML_ENDPOINT", "")
AZURE_ML_TOKEN = os.environ.get("AZURE_ML_TOKEN", "")

BLOB_CONN_STRING = os.environ.get("BLOB_CONN_STRING", "")
BLOB_CONTAINER = os.environ.get("BLOB_CONTAINER", "invites")

FIREBASE_SERVICE_ACCOUNT_JSON = os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON", "")


# ----------------------------
# Clients (warm-start)
# ----------------------------
openai_client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None

cosmos_client = CosmosClient(COSMOS_URL, credential=COSMOS_KEY) if (COSMOS_URL and COSMOS_KEY) else None
cosmos_db = cosmos_client.get_database_client(COSMOS_DB_NAME) if cosmos_client else None
conversations_ct = cosmos_db.get_container_client(COSMOS_CONTAINER_CONVERSATIONS) if cosmos_db else None
messages_ct = cosmos_db.get_container_client(COSMOS_CONTAINER_MESSAGES) if cosmos_db else None

blob_service = BlobServiceClient.from_connection_string(BLOB_CONN_STRING) if BLOB_CONN_STRING else None
blob_container = blob_service.get_container_client(BLOB_CONTAINER) if blob_service else None


def _utc_now_iso() -> str:
    return datetime.datetime.utcnow().replace(tzinfo=datetime.timezone.utc).isoformat()


def _init_firebase() -> None:
    if firebase_admin._apps:
        return
    if not FIREBASE_SERVICE_ACCOUNT_JSON:
        raise RuntimeError("Missing FIREBASE_SERVICE_ACCOUNT_JSON in app settings.")
    cred_obj = json.loads(FIREBASE_SERVICE_ACCOUNT_JSON)
    firebase_admin.initialize_app(credentials.Certificate(cred_obj))


def _get_uid_from_firebase(req: func.HttpRequest) -> str:
    auth_header = req.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise PermissionError("Missing Authorization: Bearer <firebase_id_token> header.")
    id_token = auth_header.split("Bearer ", 1)[1].strip()

    _init_firebase()
    decoded = auth.verify_id_token(id_token)
    uid = decoded.get("uid")
    if not uid:
        raise PermissionError("Firebase token verified but uid not found.")
    return uid


def _ensure_conversation(uid: str, conversation_id: Optional[str], user_message: Optional[str] = None) -> str:
    """
    conversations container partition key: /uid
    conversation item id = conversationId
    """
    now = _utc_now_iso()

    if conversation_id:
        # Verify conversation belongs to uid
        try:
            conversations_ct.read_item(item=conversation_id, partition_key=uid)
            return conversation_id
        except Exception:
            raise PermissionError("Invalid conversationId for this user.")

    # Create new conversation
    new_id = f"conv_{uuid.uuid4().hex}"
    title = (user_message[:50] + "...") if user_message and len(user_message) > 50 else (user_message or "Chat")
    conversations_ct.create_item({
        "id": new_id,
        "uid": uid,
        "createdAt": now,
        "updatedAt": now,
        "messageCount": 0,
        "title": title
    })
    return new_id


def _save_message(uid: str, conversation_id: str, role: str, msg_type: str, content: str) -> None:
    """
    messages container partition key: /conversationId
    """
    now = _utc_now_iso()

    messages_ct.create_item({
        "id": f"msg_{uuid.uuid4().hex}",
        "conversationId": conversation_id,
        "uid": uid,
        "role": role,          # "user" | "assistant"
        "type": msg_type,      # "text" | "image"
        "content": content,
        "createdAt": now
    })

    # Update conversation metadata
    conv = conversations_ct.read_item(item=conversation_id, partition_key=uid)
    conv["updatedAt"] = now
    conv["messageCount"] = int(conv.get("messageCount", 0)) + 1
    conversations_ct.replace_item(item=conversation_id, body=conv)


def _get_recent_messages(conversation_id: str) -> List[Dict[str, str]]:
    query = """
        SELECT TOP @n c.role, c.type, c.content, c.createdAt
        FROM c
        WHERE c.conversationId = @cid
        ORDER BY c.createdAt DESC
    """
    params = [
        {"name": "@n", "value": HISTORY_LIMIT},
        {"name": "@cid", "value": conversation_id},
    ]

    items = list(messages_ct.query_items(
        query=query,
        parameters=params,
        partition_key=conversation_id
    ))
    items.reverse()

    history: List[Dict[str, str]] = []
    for m in items:
        if m.get("type") == "image":
            content = f"[Generated image] {m.get('content')}"
        else:
            content = m.get("content", "")
        history.append({"role": m.get("role", "user"), "content": content})
    return history


def _call_router_llm(history: List[Dict[str, str]]) -> Dict[str, Any]:
    if not openai_client:
        raise RuntimeError("OPENAI_API_KEY is missing or OpenAI client not initialized.")

    resp = openai_client.chat.completions.create(
        model="gpt-4.1-nano",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            *history
        ],
        response_format={"type": "json_object"}
    )
    return json.loads(resp.choices[0].message.content)


def _azureml_generate(prompt: str) -> Dict[str, Any]:
    if not AZURE_ML_ENDPOINT or not AZURE_ML_TOKEN:
        raise RuntimeError("Missing AZURE_ML_ENDPOINT or AZURE_ML_TOKEN.")

    r = requests.post(
        AZURE_ML_ENDPOINT,
        headers={
            "Authorization": f"Bearer {AZURE_ML_TOKEN}",
            "Content-Type": "application/json"
        },
        json={"prompt": prompt},
        timeout=AZURE_ML_TIMEOUT_SECONDS
    )
    r.raise_for_status()
    return r.json()


def _upload_base64_png_to_public_blob(b64_png: str, uid: str, conversation_id: str) -> str:
    if not blob_container:
        raise RuntimeError("Blob client not initialized. Check BLOB_CONN_STRING/BLOB_CONTAINER.")

    if b64_png.startswith("data:"):
        b64_png = b64_png.split(",", 1)[1]
        
    img_bytes = base64.b64decode(b64_png)

    blob_name = f"{uid}/{conversation_id}/{uuid.uuid4().hex}.png"
    bc = blob_container.get_blob_client(blob_name)

    bc.upload_blob(
        img_bytes,
        overwrite=True,
        content_settings=ContentSettings(content_type="image/png")
    )
    # Container must be set to Public access: Blob
    return bc.url


@app.route(route="sessions", methods=["GET", "OPTIONS"])
def list_sessions(req: func.HttpRequest) -> func.HttpResponse:
    """List all conversations for the authenticated user."""
    try:
        if req.method == "OPTIONS":
            return func.HttpResponse("", status_code=204)
        
        if not (conversations_ct and messages_ct):
            return func.HttpResponse(
                json.dumps({"error": "Cosmos not configured. Check COSMOS_* settings."}),
                status_code=500,
                mimetype="application/json"
            )

        uid = _get_uid_from_firebase(req)
        
        query = """
            SELECT c.id, c.title, c.createdAt, c.updatedAt, c.messageCount
            FROM c
            WHERE c.uid = @uid
            ORDER BY c.updatedAt DESC
        """
        params = [{"name": "@uid", "value": uid}]
        
        items = list(conversations_ct.query_items(
            query=query,
            parameters=params,
            partition_key=uid
        ))
        
        sessions = [
            {
                "conversationId": item["id"],
                "title": item.get("title", "Chat"),
                "createdAt": item.get("createdAt"),
                "updatedAt": item.get("updatedAt"),
                "messageCount": item.get("messageCount", 0)
            }
            for item in items
        ]
        
        return func.HttpResponse(
            json.dumps(sessions),
            status_code=200,
            mimetype="application/json"
        )
    except PermissionError as e:
        return func.HttpResponse(json.dumps({"error": str(e)}), status_code=401, mimetype="application/json")
    except Exception as e:
        logging.exception("list_sessions failed")
        return func.HttpResponse(json.dumps({"error": str(e)}), status_code=500, mimetype="application/json")


@app.route(route="sessions/{conversationId}", methods=["GET", "OPTIONS"])
def get_conversation(req: func.HttpRequest, conversationId: str) -> func.HttpResponse:
    """Get all messages for a specific conversation."""
    try:
        if req.method == "OPTIONS":
            return func.HttpResponse("", status_code=204)
        
        if not (conversations_ct and messages_ct):
            return func.HttpResponse(
                json.dumps({"error": "Cosmos not configured. Check COSMOS_* settings."}),
                status_code=500,
                mimetype="application/json"
            )

        uid = _get_uid_from_firebase(req)
        
        # Verify conversation belongs to user
        try:
            conversations_ct.read_item(item=conversationId, partition_key=uid)
        except Exception:
            return func.HttpResponse(
                json.dumps({"error": "Conversation not found or access denied"}),
                status_code=404,
                mimetype="application/json"
            )
        
        # Get all messages for this conversation
        query = """
            SELECT c.role, c.type, c.content, c.createdAt
            FROM c
            WHERE c.conversationId = @cid
            ORDER BY c.createdAt ASC
        """
        params = [{"name": "@cid", "value": conversationId}]
        
        items = list(messages_ct.query_items(
            query=query,
            parameters=params,
            partition_key=conversationId
        ))
        
        messages = [
            {
                "role": item.get("role"),
                "type": item.get("type"),
                "content": item.get("content")
            }
            for item in items
        ]
        
        return func.HttpResponse(
            json.dumps({
                "conversationId": conversationId,
                "messages": messages
            }),
            status_code=200,
            mimetype="application/json"
        )
    except PermissionError as e:
        return func.HttpResponse(json.dumps({"error": str(e)}), status_code=401, mimetype="application/json")
    except Exception as e:
        logging.exception("get_conversation failed")
        return func.HttpResponse(json.dumps({"error": str(e)}), status_code=500, mimetype="application/json")


@app.route(route="chat", methods=["POST","OPTIONS"])
def chat(req: func.HttpRequest) -> func.HttpResponse:
    try:
        # CORS preflight
        if req.method == "OPTIONS":
            return func.HttpResponse("", status_code=204)
        
        if not (conversations_ct and messages_ct):
            return func.HttpResponse(
                json.dumps({"error": "Cosmos not configured. Check COSMOS_* settings."}),
                status_code=500,
                mimetype="application/json"
            )

        body = req.get_json()
        user_message = body.get("message")
        conversation_id = body.get("conversationId")

        if not user_message:
            return func.HttpResponse(
                json.dumps({"error": "Missing 'message' in request body."}),
                status_code=400,
                mimetype="application/json"
            )

        # 1) Firebase auth -> uid
        uid = _get_uid_from_firebase(req)

        # 2) Ensure conversation exists + belongs to uid
        conversation_id = _ensure_conversation(uid, conversation_id, user_message)

        # 3) Save user message
        _save_message(uid, conversation_id, role="user", msg_type="text", content=user_message)

        # 4) Load recent messages as context
        history = _get_recent_messages(conversation_id)

        # 5) Router via GPT
        router = _call_router_llm(history)
        intent = router.get("intent")

        if intent == "chat":
            assistant_text = router.get("response") or "Sorry — I couldn't generate a response."
            _save_message(uid, conversation_id, role="assistant", msg_type="text", content=assistant_text)
            return func.HttpResponse(
                json.dumps({"conversationId": conversation_id, "type": "text", "data": assistant_text}),
                status_code=200,
                mimetype="application/json"
            )

        if intent == "create_invitation":
            prompt_for_model = router.get("prompt_for_model") or user_message
            image_payload = _azureml_generate(prompt_for_model)

            # Azure ML can return either image_url or image_base64
            if image_payload.get("image_url"):
                image_url = image_payload["image_url"]
            elif image_payload.get("image_base64"):
                image_url = _upload_base64_png_to_public_blob(image_payload["image_base64"], uid, conversation_id)
            else:
                raise RuntimeError("Azure ML response missing image_url/image_base64.")

            _save_message(uid, conversation_id, role="assistant", msg_type="image", content=image_url)

            return func.HttpResponse(
                json.dumps({"conversationId": conversation_id, "type": "image", "data": image_url}),
                status_code=200,
                mimetype="application/json"
            )

        # Unknown intent fallback
        fallback = "Sorry — I couldn't understand that request."
        _save_message(uid, conversation_id, role="assistant", msg_type="text", content=fallback)
        return func.HttpResponse(
            json.dumps({"conversationId": conversation_id, "type": "text", "data": fallback}),
            status_code=200,
            mimetype="application/json"
        )

    except PermissionError as e:
        return func.HttpResponse(json.dumps({"error": str(e)}), status_code=401, mimetype="application/json")
    except Exception as e:
        logging.exception("chat function failed")
        return func.HttpResponse(json.dumps({"error": str(e)}), status_code=500, mimetype="application/json")
