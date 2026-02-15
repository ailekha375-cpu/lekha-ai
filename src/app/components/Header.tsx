'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../lib/useAuth';
import { signIn, signUp, logOut } from '../lib/auth';
import { useRouter } from 'next/navigation';
import { useModal } from './ModalContext';

export default function Header() {
  const [isServicesDropdownOpen, setIsServicesDropdownOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const { showModal, setShowModal } = useModal();
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const user = useAuth();
  const router = useRouter();

  // Password validation rules
  const passwordRules = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    digit: /\d/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };

  const isPasswordValid = Object.values(passwordRules).every(rule => rule);
  const doPasswordsMatch = password === confirmPassword;

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsServicesDropdownOpen(false);
      }
      if (
        profileDropdownRef.current &&
        !profileDropdownRef.current.contains(event.target as Node)
      ) {
        setIsProfileDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    
    // Validate password for signup
    if (isSignup) {
      if (!isPasswordValid) {
        setError('Password does not meet all requirements');
        return;
      }
      if (!doPasswordsMatch) {
        setError('Passwords do not match');
        return;
      }
    }

    try {
      if (isSignup) {
        await signUp(email, password);
      } else {
        await signIn(email, password);
      }
      setShowModal(false);
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      router.push('/success');
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    }
  }

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setError('');
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const handleLogout = async () => {
    await logOut();
    router.push('/');
  };

  return (
    <header className="w-full py-8 px-8 flex items-center justify-between" style={{ background: 'transparent' }}>
      {/* App Name */}
      <div className="flex-shrink-0">
        <h1
          className="text-3xl font-bold text-black select-none"
          style={{ fontFamily: 'Kaivalya, serif' }}
        >
          Lekha
        </h1>
      </div>
      {/* Navigation Links */}
      <nav className="flex items-center space-x-8 relative z-10">
        {/* Services Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsServicesDropdownOpen((v) => !v)}
            className="flex items-center space-x-1 text-black text-lg font-medium hover:text-gray-700 focus:outline-none transition-colors duration-200"
          >
            <span>Services</span>
            <svg
              className={`w-4 h-4 transition-transform duration-200 ${isServicesDropdownOpen ? 'rotate-180' : ''}`}
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
          {isServicesDropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg py-2 border border-gray-200">
              <a
                href="#"
                className="block px-4 py-2 text-base text-black hover:bg-gray-100 hover:text-gray-800 transition-colors duration-200 font-medium"
              >
                Send Invites
              </a>
              <a
                href="#"
                className="block px-4 py-2 text-base text-black hover:bg-gray-100 hover:text-gray-800 transition-colors duration-200 font-medium"
              >
                Track RSVPs
              </a>
              <a
                href="#"
                className="block px-4 py-2 text-base text-black hover:bg-gray-100 hover:text-gray-800 transition-colors duration-200 font-medium"
              >
                Use AI
              </a>
            </div>
          )}
        </div>
        {/* Auth/Profile Button */}
        {user ? (
          <div className="relative" ref={profileDropdownRef}>
            <button
              onClick={() => setIsProfileDropdownOpen((v) => !v)}
              className="ml-4 w-10 h-10 rounded-full bg-gradient-to-r from-gray-300 to-gray-400 flex items-center justify-center font-bold text-black text-lg shadow-lg"
              title={user.email || 'Profile'}
            >
              {user.email?.charAt(0).toUpperCase() || 'U'}
            </button>
            {isProfileDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg py-2 border border-gray-200">
                <a href="#" className="block px-4 py-2 text-base text-black hover:bg-gray-100 font-medium">My Invitations</a>
                <a href="#" className="block px-4 py-2 text-base text-black hover:bg-gray-100 font-medium">My Guests</a>
                <a href="#" className="block px-4 py-2 text-base text-black hover:bg-gray-100 font-medium">My Profile</a>
                <button onClick={handleLogout} className="block w-full text-left px-4 py-2 text-base text-red-600 hover:bg-gray-100 font-medium">Log Out</button>
              </div>
            )}
          </div>
        ) : (
          <button
            className="ml-4 bg-gradient-to-r from-gray-300 to-gray-400 text-black px-6 py-3 rounded-full font-semibold text-base hover:from-gray-400 hover:to-gray-500 transition-all duration-200 transform hover:scale-105 shadow-lg"
            onClick={() => setShowModal(true)}
          >
            Login / Signup
          </button>
        )}
      </nav>
      {/* Modal for Login/Signup */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
          <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md relative">
            <div className="text-center mb-2">
              <div className="flex flex-col justify-center items-center mt-4" style={{minHeight: '40%'}}>
                <h3 className="text-5xl font-extrabold text-gray-800 leading-tight" style={{fontFamily: 'Kaivalya, serif', lineHeight: '1.1', minHeight: '3.5rem'}}>
                  Lekha
                </h3>
              </div>
            </div>
            <button 
              className="absolute top-4 right-4 text-gray-500 hover:text-black text-2xl" 
              onClick={() => {
                setShowModal(false);
                resetForm();
              }}
            >
              &times;
            </button>
            <h2 className="text-2xl font-bold mb-2 text-center">{isSignup ? 'Sign Up' : 'Login'}</h2>
            <form onSubmit={handleAuth} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  id="email"
                  type="email"
                  placeholder="xyz@gmail.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent placeholder-gray-400 text-black"
                  required
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  {isSignup ? 'Create Password' : 'Password'}
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent placeholder-gray-400 text-black"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {!showPassword ? (
                      // Open eye (show password action)
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    ) : (
                      // Crossed eye (hide password action)
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              
              {isSignup && (
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                    Re-enter Password
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Re-enter your password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent placeholder-gray-400 text-black"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {!showConfirmPassword ? (
                        // Open eye (show password action)
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      ) : (
                        // Crossed eye (hide password action)
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Password validation rules for signup */}
              {isSignup && password && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Password Requirements:</h4>
                  <div className="space-y-1 text-sm">
                    <div className={`flex items-center ${passwordRules.length ? 'text-green-600' : 'text-red-600'}`}>
                      <span className="mr-2">{passwordRules.length ? '✓' : '✗'}</span>
                      At least 8 characters
                    </div>
                    <div className={`flex items-center ${passwordRules.uppercase ? 'text-green-600' : 'text-red-600'}`}>
                      <span className="mr-2">{passwordRules.uppercase ? '✓' : '✗'}</span>
                      At least 1 uppercase letter
                    </div>
                    <div className={`flex items-center ${passwordRules.lowercase ? 'text-green-600' : 'text-red-600'}`}>
                      <span className="mr-2">{passwordRules.lowercase ? '✓' : '✗'}</span>
                      At least 1 lowercase letter
                    </div>
                    <div className={`flex items-center ${passwordRules.digit ? 'text-green-600' : 'text-red-600'}`}>
                      <span className="mr-2">{passwordRules.digit ? '✓' : '✗'}</span>
                      At least 1 digit
                    </div>
                    <div className={`flex items-center ${passwordRules.special ? 'text-green-600' : 'text-red-600'}`}>
                      <span className="mr-2">{passwordRules.special ? '✓' : '✗'}</span>
                      At least 1 special character
                    </div>
                  </div>
                  {confirmPassword && (
                    <div className={`mt-2 text-sm ${doPasswordsMatch ? 'text-green-600' : 'text-red-600'}`}>
                      {doPasswordsMatch ? '✓ Passwords match' : '✗ Passwords do not match'}
                    </div>
                  )}
                </div>
              )}

              {error && <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-lg">{error}</div>}
              
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-gray-300 to-gray-400 text-black py-3 rounded-lg font-semibold hover:from-gray-400 hover:to-gray-500 transition-all duration-200 shadow-lg"
              >
                {isSignup ? 'Sign Up' : 'Login'}
              </button>
            </form>
            <div className="mt-6 text-center">
              <button
                className="text-blue-600 hover:underline text-sm"
                onClick={() => {
                  setIsSignup(v => !v);
                  resetForm();
                }}
              >
                {isSignup ? 'Already have an account? Login' : "Don't have an account? Sign Up"}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
} 