export default function Footer() {
  return (
    <footer className="w-full pt-12 pb-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-6 md:space-y-0">
          {/* Company Logo */}
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-r from-gray-300 to-gray-400 rounded-xl flex items-center justify-center">
              <span className="text-black text-xl font-bold">L</span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-black" style={{ fontFamily: 'Kaivalya, serif' }}>
                Lekh.ai
              </h3>
              <p className="text-sm text-black">Creating beautiful invitations</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex items-center space-x-8">
            <a
              href="#"
              className="text-black hover:text-gray-700 transition-colors duration-200 font-medium text-base"
            >
              About Us
            </a>
            <a
              href="#"
              className="text-black hover:text-gray-700 transition-colors duration-200 font-medium text-base"
            >
              Contact
            </a>
            <div className="relative group">
              <button className="text-black hover:text-gray-700 transition-colors duration-200 font-medium flex items-center space-x-1 text-base">
                <span>Services</span>
                <svg
                  className="w-4 h-4 transition-transform duration-200 group-hover:rotate-180"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              {/* Dropdown Menu */}
              <div className="absolute bottom-full right-0 mb-2 w-48 bg-white rounded-lg shadow-lg py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 border border-gray-200">
                <a
                  href="#"
                  className="block px-4 py-2 text-sm text-black hover:bg-gray-100 hover:text-gray-800 transition-colors duration-200 font-medium"
                >
                  Send Invites
                </a>
                <a
                  href="#"
                  className="block px-4 py-2 text-sm text-black hover:bg-gray-100 hover:text-gray-800 transition-colors duration-200 font-medium"
                >
                  Track RSVPs
                </a>
                <a
                  href="#"
                  className="block px-4 py-2 text-sm text-black hover:bg-gray-100 hover:text-gray-800 transition-colors duration-200 font-medium"
                >
                  Use AI
                </a>
              </div>
            </div>
          </nav>
        </div>

        {/* Bottom Section */}
        <div className="mt-8 flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <p className="text-sm text-black">
            © 2025 Lekha. All rights reserved.
          </p>
          <div className="flex items-center space-x-6">
            <a
              href="#"
              className="text-sm text-black hover:text-gray-700 transition-colors duration-200"
            >
              Privacy Policy
            </a>
            <a
              href="#"
              className="text-sm text-black hover:text-gray-700 transition-colors duration-200"
            >
              Terms of Service
            </a>
            <div className="flex items-center space-x-3">
              <a
                href="#"
                className="w-8 h-8 bg-gradient-to-r from-gray-300 to-gray-400 rounded-full flex items-center justify-center hover:scale-110 transition-transform duration-200"
              >
                <span className="text-black text-sm">📧</span>
              </a>
              <a
                href="#"
                className="w-8 h-8 bg-gradient-to-r from-gray-300 to-gray-400 rounded-full flex items-center justify-center hover:scale-110 transition-transform duration-200"
              >
                <span className="text-black text-sm">📱</span>
              </a>
              <a
                href="#"
                className="w-8 h-8 bg-gradient-to-r from-gray-300 to-gray-400 rounded-full flex items-center justify-center hover:scale-110 transition-transform duration-200"
              >
                <span className="text-black text-sm">💬</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
} 