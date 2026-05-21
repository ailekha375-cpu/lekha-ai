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
- Use intent="create_invitation" only when the user is asking for a visual invitation design, invitation background, invitation template, or invitation image to be generated.
- If the user is asking for wording, invitation copy, RSVP text, subject lines, reminder text, email drafts, messaging help, or planning help, use intent="chat".
- If the user is asking to modify or refine the wording of an invite or email, use intent="chat".
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
COSMOS_CONTAINER_EVENTS = os.environ.get("COSMOS_CONTAINER_EVENTS", "events")
COSMOS_CONTAINER_GUESTS = os.environ.get("COSMOS_CONTAINER_GUESTS", "guests")
COSMOS_CONTAINER_RSVP_RESPONSES = os.environ.get("COSMOS_CONTAINER_RSVP_RESPONSES", "rsvpResponses")

AZURE_ML_ENDPOINT = os.environ.get("AZURE_ML_ENDPOINT", "")
AZURE_ML_TOKEN = os.environ.get("AZURE_ML_TOKEN", "")
PLACEHOLDER_INVITE_URL = os.environ.get("PLACEHOLDER_INVITE_URL", "/wedding.svg")
EMAIL_PROVIDER = os.environ.get("EMAIL_PROVIDER", "resend")
EMAIL_API_KEY = os.environ.get("EMAIL_API_KEY", "")
EMAIL_FROM = os.environ.get("EMAIL_FROM", "")
APP_BASE_URL = os.environ.get("APP_BASE_URL", "http://localhost:3000")

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
events_ct = cosmos_db.get_container_client(COSMOS_CONTAINER_EVENTS) if cosmos_db else None
guests_ct = cosmos_db.get_container_client(COSMOS_CONTAINER_GUESTS) if cosmos_db else None
rsvp_responses_ct = cosmos_db.get_container_client(COSMOS_CONTAINER_RSVP_RESPONSES) if cosmos_db else None

blob_service = BlobServiceClient.from_connection_string(BLOB_CONN_STRING) if BLOB_CONN_STRING else None
blob_container = blob_service.get_container_client(BLOB_CONTAINER) if blob_service else None


def _utc_now_iso() -> str:
    return datetime.datetime.utcnow().replace(tzinfo=datetime.timezone.utc).isoformat()


def _json_response(payload: Dict[str, Any], status_code: int = 200) -> func.HttpResponse:
    return func.HttpResponse(
        json.dumps(payload),
        status_code=status_code,
        mimetype="application/json"
    )


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
        return {"image_url": PLACEHOLDER_INVITE_URL}

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


def _upload_event_asset(asset_src: str, uid: str, event_id: str) -> str:
    if not asset_src:
        raise RuntimeError("Missing asset source.")
    if asset_src.startswith("http://") or asset_src.startswith("https://") or asset_src.startswith("/"):
        return asset_src
    if asset_src.startswith("data:image/png;base64,"):
        return _upload_base64_png_to_public_blob(asset_src, uid, f"{event_id}-campaign-kit")
    raise RuntimeError("Unsupported invite asset format. Use an HTTP URL, app-relative asset, or PNG data URL.")


def _require_rsvp_containers() -> None:
    if not (events_ct and guests_ct and rsvp_responses_ct):
        raise RuntimeError(
            "RSVP containers not configured. Check COSMOS_CONTAINER_EVENTS, "
            "COSMOS_CONTAINER_GUESTS, and COSMOS_CONTAINER_RSVP_RESPONSES."
        )


def _get_event_for_user(uid: str, event_id: str) -> Dict[str, Any]:
    return events_ct.read_item(item=event_id, partition_key=uid)


def _find_guest_by_token(token: str) -> Optional[Dict[str, Any]]:
    query = "SELECT TOP 1 * FROM c WHERE c.rsvpToken = @token"
    params = [{"name": "@token", "value": token}]
    items = list(guests_ct.query_items(
        query=query,
        parameters=params,
        enable_cross_partition_query=True
    ))
    return items[0] if items else None


def _find_rsvp_response(event_id: str, guest_id: str) -> Optional[Dict[str, Any]]:
    query = "SELECT TOP 1 * FROM c WHERE c.eventId = @eventId AND c.guestId = @guestId"
    params = [
        {"name": "@eventId", "value": event_id},
        {"name": "@guestId", "value": guest_id},
    ]
    items = list(rsvp_responses_ct.query_items(
        query=query,
        parameters=params,
        partition_key=event_id
    ))
    return items[0] if items else None


def _list_rsvp_responses(event_id: str) -> List[Dict[str, Any]]:
    query = "SELECT * FROM c WHERE c.eventId = @eventId ORDER BY c.updatedAt DESC"
    params = [{"name": "@eventId", "value": event_id}]
    return list(rsvp_responses_ct.query_items(
        query=query,
        parameters=params,
        partition_key=event_id
    ))


def _event_summary(event: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": event["id"],
        "title": event.get("title"),
        "eventType": event.get("eventType"),
        "hostName": event.get("hostName"),
        "description": event.get("description"),
        "eventDate": event.get("eventDate"),
        "venue": event.get("venue"),
        "rsvpDeadline": event.get("rsvpDeadline"),
        "generatedTemplateUrl": event.get("generatedTemplateUrl"),
        "finalInviteUrl": event.get("finalInviteUrl"),
        "campaignKit": event.get("campaignKit") or {
            "inviteAsset": None,
            "emailDraft": None,
            "linkedChats": [],
            "updatedAt": None,
        },
        "lastInviteSendAt": event.get("lastInviteSendAt"),
        "lastInviteSubject": event.get("lastInviteSubject"),
        "sentGuestCount": event.get("sentGuestCount", 0),
        "status": event.get("status", "draft"),
        "createdAt": event.get("createdAt"),
        "updatedAt": event.get("updatedAt"),
    }


def _normalize_campaign_kit(raw_kit: Optional[Dict[str, Any]], uid: str, event_id: str) -> Dict[str, Any]:
    kit = raw_kit or {}
    invite_asset = kit.get("inviteAsset")
    normalized_invite = None
    if isinstance(invite_asset, dict) and invite_asset.get("src"):
        normalized_invite = {
            "src": _upload_event_asset(str(invite_asset.get("src")), uid, event_id),
            "updatedAt": invite_asset.get("updatedAt") or _utc_now_iso(),
            "sourceConversationId": invite_asset.get("sourceConversationId"),
            "variant": "final" if invite_asset.get("variant") == "final" else "template",
        }

    email_draft = kit.get("emailDraft")
    normalized_draft = None
    if isinstance(email_draft, dict) and (email_draft.get("content") or "").strip():
        normalized_draft = {
            "content": str(email_draft.get("content")).strip(),
            "updatedAt": email_draft.get("updatedAt") or _utc_now_iso(),
            "sourceConversationId": email_draft.get("sourceConversationId"),
            "sourceMessageId": email_draft.get("sourceMessageId"),
        }

    linked_chats_raw = kit.get("linkedChats") or []
    linked_chats: List[Dict[str, Any]] = []
    if isinstance(linked_chats_raw, list):
        for chat in linked_chats_raw[:8]:
            if not isinstance(chat, dict):
                continue
            conversation_id = str(chat.get("conversationId") or "").strip()
            title = str(chat.get("title") or "").strip()
            if not conversation_id or not title:
                continue
            linked_chats.append({
                "conversationId": conversation_id,
                "title": title,
                "updatedAt": chat.get("updatedAt") or _utc_now_iso(),
            })

    return {
        "inviteAsset": normalized_invite,
        "emailDraft": normalized_draft,
        "linkedChats": linked_chats,
        "updatedAt": kit.get("updatedAt") or _utc_now_iso(),
    }


def _merge_campaign_kit(existing_event: Dict[str, Any], incoming_kit: Dict[str, Any], uid: str, event_id: str) -> Dict[str, Any]:
    current_kit = existing_event.get("campaignKit") or {
        "inviteAsset": None,
        "emailDraft": None,
        "linkedChats": [],
        "updatedAt": None,
    }
    normalized_kit = _normalize_campaign_kit(incoming_kit, uid, event_id)

    linked_chats = normalized_kit.get("linkedChats") or current_kit.get("linkedChats") or []
    if normalized_kit.get("linkedChats") and current_kit.get("linkedChats"):
        seen = set()
        merged = []
        for chat in normalized_kit["linkedChats"] + current_kit["linkedChats"]:
            cid = chat.get("conversationId")
            if not cid or cid in seen:
                continue
            seen.add(cid)
            merged.append(chat)
        linked_chats = merged[:8]

    return {
        "inviteAsset": normalized_kit.get("inviteAsset") or current_kit.get("inviteAsset"),
        "emailDraft": normalized_kit.get("emailDraft") or current_kit.get("emailDraft"),
        "linkedChats": linked_chats,
        "updatedAt": _utc_now_iso(),
    }


def _send_email_via_provider(to_email: str, subject: str, html: str) -> Dict[str, Any]:
    if EMAIL_PROVIDER.lower() != "resend":
        raise RuntimeError(f"Unsupported EMAIL_PROVIDER '{EMAIL_PROVIDER}'. Currently only 'resend' is implemented.")
    if not EMAIL_API_KEY or not EMAIL_FROM:
        raise RuntimeError("Email sending is not configured. Set EMAIL_API_KEY and EMAIL_FROM.")

    response = requests.post(
        "https://api.resend.com/emails",
        headers={
            "Authorization": f"Bearer {EMAIL_API_KEY}",
            "Content-Type": "application/json",
        },
        json={
            "from": EMAIL_FROM,
            "to": [to_email],
            "subject": subject,
            "html": html,
        },
        timeout=30,
    )
    response.raise_for_status()
    return response.json()


@app.route(route="events", methods=["GET", "POST", "OPTIONS"])
def events(req: func.HttpRequest) -> func.HttpResponse:
    try:
        if req.method == "OPTIONS":
            return func.HttpResponse("", status_code=204)

        _require_rsvp_containers()
        uid = _get_uid_from_firebase(req)

        if req.method == "GET":
            logging.info("Loading events for uid=%s", uid)
            query = "SELECT * FROM c WHERE c.uid = @uid"
            params = [{"name": "@uid", "value": uid}]
            items = list(events_ct.query_items(
                query=query,
                parameters=params,
                partition_key=uid
            ))
            items.sort(key=lambda item: item.get("updatedAt", ""), reverse=True)
            logging.info("Loaded %s events for uid=%s", len(items), uid)
            return _json_response({"events": [_event_summary(item) for item in items]})

        body = req.get_json()
        title = (body.get("title") or "").strip()
        if not title:
            return _json_response({"error": "Missing required field: title"}, status_code=400)

        now = _utc_now_iso()
        event_id = f"event_{uuid.uuid4().hex}"
        event = {
            "id": event_id,
            "uid": uid,
            "title": title,
            "eventType": (body.get("eventType") or "custom").strip(),
            "hostName": (body.get("hostName") or "").strip(),
            "description": (body.get("description") or "").strip(),
            "eventDate": body.get("eventDate"),
            "venue": (body.get("venue") or "").strip(),
            "rsvpDeadline": body.get("rsvpDeadline"),
            "generatedTemplateUrl": body.get("generatedTemplateUrl"),
            "finalInviteUrl": body.get("finalInviteUrl"),
            "campaignKit": {
                "inviteAsset": None,
                "emailDraft": None,
                "linkedChats": [],
                "updatedAt": now,
            },
            "lastInviteSendAt": None,
            "lastInviteSubject": None,
            "sentGuestCount": 0,
            "status": (body.get("status") or "draft").strip() or "draft",
            "createdAt": now,
            "updatedAt": now,
        }
        events_ct.create_item(event)
        return _json_response({"event": _event_summary(event)}, status_code=201)
    except PermissionError as e:
        return _json_response({"error": str(e)}, status_code=401)
    except Exception as e:
        logging.exception("events route failed")
        return _json_response({"error": str(e)}, status_code=500)


@app.route(route="events/{eventId}", methods=["GET", "DELETE", "OPTIONS"])
def event_by_id(req: func.HttpRequest) -> func.HttpResponse:
    try:
        if req.method == "OPTIONS":
            return func.HttpResponse("", status_code=204)

        _require_rsvp_containers()
        event_id = req.route_params.get("eventId")
        if not event_id:
            return _json_response({"error": "Missing eventId in route."}, status_code=400)

        uid = _get_uid_from_firebase(req)
        event = _get_event_for_user(uid, event_id)

        if req.method == "DELETE":
            guest_query = "SELECT c.id FROM c WHERE c.eventId = @eventId"
            guest_params = [{"name": "@eventId", "value": event_id}]
            guest_items = list(guests_ct.query_items(
                query=guest_query,
                parameters=guest_params,
                partition_key=event_id
            ))
            for guest_item in guest_items:
                guests_ct.delete_item(item=guest_item["id"], partition_key=event_id)

            response_query = "SELECT c.id FROM c WHERE c.eventId = @eventId"
            response_params = [{"name": "@eventId", "value": event_id}]
            response_items = list(rsvp_responses_ct.query_items(
                query=response_query,
                parameters=response_params,
                partition_key=event_id
            ))
            for response_item in response_items:
                rsvp_responses_ct.delete_item(item=response_item["id"], partition_key=event_id)

            events_ct.delete_item(item=event_id, partition_key=uid)
            return _json_response({
                "deleted": True,
                "eventId": event_id,
                "deletedGuests": len(guest_items),
                "deletedResponses": len(response_items),
            })

        return _json_response({"event": _event_summary(event)})
    except PermissionError as e:
        return _json_response({"error": str(e)}, status_code=401)
    except Exception as e:
        logging.exception("event_by_id failed")
        return _json_response({"error": str(e)}, status_code=500)


@app.route(route="events/{eventId}/campaign-kit", methods=["GET", "PATCH", "OPTIONS"])
def event_campaign_kit(req: func.HttpRequest) -> func.HttpResponse:
    try:
        if req.method == "OPTIONS":
            return func.HttpResponse("", status_code=204)

        _require_rsvp_containers()
        event_id = req.route_params.get("eventId")
        if not event_id:
            return _json_response({"error": "Missing eventId in route."}, status_code=400)

        uid = _get_uid_from_firebase(req)
        event = _get_event_for_user(uid, event_id)

        if req.method == "GET":
            return _json_response({
                "campaignKit": event.get("campaignKit") or {
                    "inviteAsset": None,
                    "emailDraft": None,
                    "linkedChats": [],
                    "updatedAt": None,
                }
            })

        body = req.get_json()
        incoming_kit = body.get("campaignKit")
        if not isinstance(incoming_kit, dict):
            return _json_response({"error": "Body must include a campaignKit object."}, status_code=400)

        event["campaignKit"] = _merge_campaign_kit(event, incoming_kit, uid, event_id)
        event["updatedAt"] = _utc_now_iso()
        events_ct.replace_item(item=event_id, body=event)
        return _json_response({"campaignKit": event["campaignKit"], "event": _event_summary(event)})
    except PermissionError as e:
        return _json_response({"error": str(e)}, status_code=401)
    except Exception as e:
        logging.exception("event_campaign_kit failed")
        return _json_response({"error": str(e)}, status_code=500)


@app.route(route="events/{eventId}/guests", methods=["GET", "POST", "OPTIONS"])
def event_guests(req: func.HttpRequest) -> func.HttpResponse:
    try:
        if req.method == "OPTIONS":
            return func.HttpResponse("", status_code=204)

        _require_rsvp_containers()
        event_id = req.route_params.get("eventId")
        if not event_id:
            return _json_response({"error": "Missing eventId in route."}, status_code=400)

        uid = _get_uid_from_firebase(req)
        _get_event_for_user(uid, event_id)

        if req.method == "GET":
            query = "SELECT * FROM c WHERE c.eventId = @eventId ORDER BY c.createdAt ASC"
            params = [{"name": "@eventId", "value": event_id}]
            guests = list(guests_ct.query_items(
                query=query,
                parameters=params,
                partition_key=event_id
            ))
            return _json_response({"guests": guests})

        body = req.get_json()
        guest_items = body.get("guests")
        if not isinstance(guest_items, list) or not guest_items:
            return _json_response({"error": "Body must include a non-empty 'guests' array."}, status_code=400)

        now = _utc_now_iso()
        created_guests: List[Dict[str, Any]] = []
        for raw_guest in guest_items:
            name = (raw_guest.get("name") or "").strip()
            email = (raw_guest.get("email") or "").strip()
            if not name or not email:
                return _json_response(
                    {"error": "Each guest must include non-empty 'name' and 'email'."},
                    status_code=400
                )

            guest = {
                "id": f"guest_{uuid.uuid4().hex}",
                "eventId": event_id,
                "uid": uid,
                "name": name,
                "email": email,
                "phone": (raw_guest.get("phone") or "").strip(),
                "groupId": (raw_guest.get("groupId") or "").strip() or None,
                "isPrimaryGuest": bool(raw_guest.get("isPrimaryGuest", True)),
                "maxGuests": int(raw_guest.get("maxGuests", 1) or 1),
                "guestType": (raw_guest.get("guestType") or "single").strip(),
                "rsvpToken": f"rsvp_{uuid.uuid4().hex}",
                "inviteStatus": (raw_guest.get("inviteStatus") or "pending").strip() or "pending",
                "inviteSentAt": raw_guest.get("inviteSentAt"),
                "lastReminderAt": raw_guest.get("lastReminderAt"),
                "createdAt": now,
                "updatedAt": now,
            }
            guests_ct.create_item(guest)
            created_guests.append(guest)

        return _json_response({"guests": created_guests}, status_code=201)
    except PermissionError as e:
        return _json_response({"error": str(e)}, status_code=401)
    except Exception as e:
        logging.exception("event_guests failed")
        return _json_response({"error": str(e)}, status_code=500)


@app.route(route="events/{eventId}/send", methods=["POST", "OPTIONS"])
def send_event_invites(req: func.HttpRequest) -> func.HttpResponse:
    try:
        if req.method == "OPTIONS":
            return func.HttpResponse("", status_code=204)

        _require_rsvp_containers()
        event_id = req.route_params.get("eventId")
        if not event_id:
            return _json_response({"error": "Missing eventId in route."}, status_code=400)

        uid = _get_uid_from_firebase(req)
        event = _get_event_for_user(uid, event_id)
        body = req.get_json()

        campaign_kit = event.get("campaignKit") or {}
        invite_asset = campaign_kit.get("inviteAsset") or {}
        email_draft = campaign_kit.get("emailDraft") or {}

        subject = (body.get("subject") or "").strip() or event.get("lastInviteSubject") or f"You're invited to {event.get('title', 'our event')}"
        message_body = (body.get("message") or "").strip() or (email_draft.get("content") or "").strip()

        if not message_body:
            return _json_response({"error": "No email draft saved for this event. Save email copy before sending."}, status_code=400)
        if not invite_asset.get("src"):
            return _json_response({"error": "No invite image saved for this event. Save an invite asset before sending."}, status_code=400)

        guest_ids = body.get("guestIds")
        query = "SELECT * FROM c WHERE c.eventId = @eventId ORDER BY c.createdAt ASC"
        params = [{"name": "@eventId", "value": event_id}]
        guest_items = list(guests_ct.query_items(
            query=query,
            parameters=params,
            partition_key=event_id
        ))
        if isinstance(guest_ids, list) and guest_ids:
            guest_id_set = {str(guest_id) for guest_id in guest_ids}
            guest_items = [guest for guest in guest_items if guest.get("id") in guest_id_set]

        if not guest_items:
            return _json_response({"error": "No guests selected for sending."}, status_code=400)

        now = _utc_now_iso()
        send_results: List[Dict[str, Any]] = []
        html_body_template = "<br>".join(line.strip() for line in message_body.splitlines() if line.strip())
        asset_src = invite_asset["src"]

        for guest in guest_items:
            to_email = (guest.get("email") or "").strip()
            if not to_email:
                send_results.append({"guestId": guest.get("id"), "name": guest.get("name"), "status": "skipped", "reason": "Missing email"})
                continue

            rsvp_url = f"{APP_BASE_URL.rstrip('/')}/rsvp/{guest.get('rsvpToken')}"
            guest_name = guest.get("name") or "Guest"
            html = f"""
                <div style="font-family: Georgia, serif; background:#faf7f2; padding:32px; color:#2d1810;">
                  <div style="max-width:640px; margin:0 auto; background:#ffffff; border-radius:24px; overflow:hidden; border:1px solid #eadfd2;">
                    <img src="{asset_src}" alt="Invitation" style="display:block; width:100%; height:auto;" />
                    <div style="padding:32px;">
                      <p style="margin:0 0 16px; font-size:16px;">Hi {guest_name},</p>
                      <div style="font-size:15px; line-height:1.8; color:#5b4635;">{html_body_template}</div>
                      <div style="margin-top:28px;">
                        <a href="{rsvp_url}" style="display:inline-block; background:#2d1810; color:#ffffff; text-decoration:none; padding:14px 22px; border-radius:999px; font-weight:600;">
                          RSVP now
                        </a>
                      </div>
                      <p style="margin:18px 0 0; font-size:13px; color:#8a6d54;">If the button does not work, open this link: {rsvp_url}</p>
                    </div>
                  </div>
                </div>
            """
            provider_response = _send_email_via_provider(to_email, subject, html)
            guest["inviteStatus"] = "sent"
            guest["inviteSentAt"] = now
            guest["updatedAt"] = now
            guests_ct.replace_item(item=guest["id"], body=guest)
            send_results.append({
                "guestId": guest.get("id"),
                "name": guest.get("name"),
                "email": to_email,
                "status": "sent",
                "providerResponse": provider_response,
            })

        sent_count = len([item for item in send_results if item["status"] == "sent"])
        event["lastInviteSendAt"] = now
        event["lastInviteSubject"] = subject
        event["sentGuestCount"] = sent_count
        event["updatedAt"] = now
        events_ct.replace_item(item=event_id, body=event)

        return _json_response({
            "sentCount": sent_count,
            "results": send_results,
            "subject": subject,
            "event": _event_summary(event),
        })
    except PermissionError as e:
        return _json_response({"error": str(e)}, status_code=401)
    except requests.HTTPError as e:
        logging.exception("send_event_invites provider call failed")
        response_text = e.response.text if e.response is not None else str(e)
        return _json_response({"error": f"Email provider error: {response_text}"}, status_code=502)
    except Exception as e:
        logging.exception("send_event_invites failed")
        return _json_response({"error": str(e)}, status_code=500)


@app.route(route="events/{eventId}/responses", methods=["GET", "OPTIONS"])
def event_responses(req: func.HttpRequest) -> func.HttpResponse:
    try:
        if req.method == "OPTIONS":
            return func.HttpResponse("", status_code=204)

        _require_rsvp_containers()
        event_id = req.route_params.get("eventId")
        if not event_id:
            return _json_response({"error": "Missing eventId in route."}, status_code=400)

        uid = _get_uid_from_firebase(req)
        _get_event_for_user(uid, event_id)

        responses = _list_rsvp_responses(event_id)
        return _json_response({"responses": responses})
    except PermissionError as e:
        return _json_response({"error": str(e)}, status_code=401)
    except Exception as e:
        logging.exception("event_responses failed")
        return _json_response({"error": str(e)}, status_code=500)


@app.route(route="rsvp/{token}", methods=["GET", "POST", "OPTIONS"])
def rsvp_by_token(req: func.HttpRequest) -> func.HttpResponse:
    try:
        if req.method == "OPTIONS":
            return func.HttpResponse("", status_code=204)

        _require_rsvp_containers()
        token = req.route_params.get("token")
        if not token:
            return _json_response({"error": "Missing RSVP token."}, status_code=400)

        guest = _find_guest_by_token(token)
        if not guest:
            return _json_response({"error": "RSVP link not found."}, status_code=404)

        event_query = "SELECT TOP 1 * FROM c WHERE c.id = @id AND c.uid = @uid"
        event_params = [
            {"name": "@id", "value": guest["eventId"]},
            {"name": "@uid", "value": guest["uid"]},
        ]
        event_items = list(events_ct.query_items(
            query=event_query,
            parameters=event_params,
            partition_key=guest["uid"]
        ))
        if not event_items:
            return _json_response({"error": "Associated event not found."}, status_code=404)
        event = event_items[0]

        if req.method == "GET":
            existing_response = _find_rsvp_response(guest["eventId"], guest["id"])
            return _json_response({
                "event": _event_summary(event),
                "guest": {
                    "id": guest["id"],
                    "name": guest.get("name"),
                    "email": guest.get("email"),
                    "maxGuests": guest.get("maxGuests", 1),
                    "guestType": guest.get("guestType", "single"),
                },
                "response": existing_response,
            })

        body = req.get_json()
        attendance_status = (body.get("attendanceStatus") or "").strip().lower()
        if attendance_status not in {"attending", "not_attending", "maybe"}:
            return _json_response(
                {"error": "attendanceStatus must be one of: attending, not_attending, maybe"},
                status_code=400
            )

        now = _utc_now_iso()
        existing_response = _find_rsvp_response(guest["eventId"], guest["id"])
        guest_count = int(body.get("guestCount", 1) or 1)
        guest_count = max(1, min(guest_count, int(guest.get("maxGuests", 1) or 1)))

        response_doc = {
            "id": existing_response["id"] if existing_response else f"rsvp_{uuid.uuid4().hex}",
            "eventId": guest["eventId"],
            "guestId": guest["id"],
            "uid": guest["uid"],
            "rsvpToken": token,
            "attendanceStatus": attendance_status,
            "guestCount": guest_count,
            "mealPreference": (body.get("mealPreference") or "").strip(),
            "notes": (body.get("notes") or "").strip(),
            "respondedBy": (body.get("respondedBy") or guest.get("name") or "").strip(),
            "submittedAt": existing_response.get("submittedAt", now) if existing_response else now,
            "updatedAt": now,
        }

        if existing_response:
            rsvp_responses_ct.replace_item(item=existing_response["id"], body=response_doc)
        else:
            rsvp_responses_ct.create_item(response_doc)

        guest["inviteStatus"] = "responded"
        guest["updatedAt"] = now
        guests_ct.replace_item(item=guest["id"], body=guest)

        return _json_response({"response": response_doc}, status_code=200)
    except Exception as e:
        logging.exception("rsvp_by_token failed")
        return _json_response({"error": str(e)}, status_code=500)


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


@app.route(route="sessions/{conversationId}", methods=["GET", "DELETE", "OPTIONS"])
def conversation_by_id(req: func.HttpRequest) -> func.HttpResponse:
    """Get or delete a specific conversation (and optionally its messages)."""
    try:
        if req.method == "OPTIONS":
            return func.HttpResponse("", status_code=204)

        conversationId = req.route_params.get("conversationId")
        if not conversationId:
            return func.HttpResponse(
                json.dumps({"error": "Missing conversationId in route."}),
                status_code=400,
                mimetype="application/json"
            )

        if not (conversations_ct and messages_ct):
            return func.HttpResponse(
                json.dumps({"error": "Cosmos not configured. Check COSMOS_* settings."}),
                status_code=500,
                mimetype="application/json"
            )

        uid = _get_uid_from_firebase(req)

        # Verify conversation belongs to user (conversations partition key: uid)
        try:
            conversations_ct.read_item(item=conversationId, partition_key=uid)
        except Exception:
            return func.HttpResponse(
                json.dumps({"error": "Conversation not found or access denied"}),
                status_code=404,
                mimetype="application/json"
            )

        # ----------------------------
        # GET: return messages
        # ----------------------------
        if req.method == "GET":
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
                {"role": i.get("role"), "type": i.get("type"), "content": i.get("content")}
                for i in items
            ]

            return func.HttpResponse(
                json.dumps({"conversationId": conversationId, "messages": messages}),
                status_code=200,
                mimetype="application/json"
            )

        # ----------------------------
        # DELETE: delete messages + conversation
        # ----------------------------
        if req.method == "DELETE":
            # Delete all messages in this conversation (messages partition key: conversationId)
            query = "SELECT c.id FROM c WHERE c.conversationId = @cid"
            params = [{"name": "@cid", "value": conversationId}]

            items = list(messages_ct.query_items(
                query=query,
                parameters=params,
                partition_key=conversationId
            ))

            for it in items:
                messages_ct.delete_item(item=it["id"], partition_key=conversationId)

            # Delete conversation record (conversations partition key: uid)
            conversations_ct.delete_item(item=conversationId, partition_key=uid)

            return func.HttpResponse(
                json.dumps({"deleted": True, "conversationId": conversationId, "deletedMessages": len(items)}),
                status_code=200,
                mimetype="application/json"
            )

        return func.HttpResponse(
            json.dumps({"error": "Method not allowed"}),
            status_code=405,
            mimetype="application/json"
        )

    except PermissionError as e:
        return func.HttpResponse(json.dumps({"error": str(e)}), status_code=401, mimetype="application/json")
    except Exception as e:
        logging.exception("conversation_by_id failed")
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
