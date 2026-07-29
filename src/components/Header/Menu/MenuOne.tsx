"use client";
import { getAuthToken, logout } from "@/lib/auth";
import { jwtDecode } from "jwt-decode"; // Import add karein
import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import * as Icon from "@phosphor-icons/react/dist/ssr";
import { usePathname } from "next/navigation";
import useLoginPopup from "@/store/useLoginPopup";
import useMenuMobile from "@/store/useMenuMobile";
import { useModalCartContext } from "@/context/ModalCartContext";
import { useModalWishlistContext } from "@/context/ModalWishlistContext";
import { useModalSearchContext } from "@/context/ModalSearchContext";
import { useCart } from "@/context/CartContext";
import TenantLogo from "@/components/Common/TenantLogo";
import DynamicCategoryMegaMenu from "@/components/Category/DynamicCategoryMegaMenu";
import DynamicCategoryMobileNav from "@/components/Category/DynamicCategoryMobileNav";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";

interface Props {
  props: string;
}

function isInvalidDisplayName(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;

  const lower = trimmed.toLowerCase();
  if (/deleted/i.test(lower)) return true;
  if (/^deleted_\d+/i.test(trimmed)) return true;
  if (trimmed.includes("_DELETED_") || trimmed.includes("_deleted_")) return true;
  if (/^user_\d+/i.test(trimmed)) return true;
  if (/^\d+$/.test(trimmed)) return true;
  if (trimmed.length > 18 && /[_\d]{4,}/.test(trimmed)) return true;

  return false;
}

function sanitizeDisplayName(value: string): string | null {
  const trimmed = value.trim();
  if (isInvalidDisplayName(trimmed)) return null;

  if (trimmed.includes("@")) {
    const localPart = trimmed.split("@")[0];
    if (isInvalidDisplayName(localPart)) return null;

    const cleanPart = localPart
      .split(/[._+-]/)
      .find((part) => part.length >= 2 && !/^\d+$/.test(part));

    if (!cleanPart || isInvalidDisplayName(cleanPart)) return null;

    return cleanPart.charAt(0).toUpperCase() + cleanPart.slice(1).toLowerCase();
  }

  const firstWord = trimmed.split(/\s+/)[0];
  if (isInvalidDisplayName(firstWord)) return null;

  return firstWord.charAt(0).toUpperCase() + firstWord.slice(1).toLowerCase();
}

function getWelcomeName(decoded: Record<string, unknown>): string | null {
  const primaryFields = [decoded.FullName, decoded.fullName, decoded.name];

  for (const value of primaryFields) {
    if (typeof value === "string") {
      const sanitized = sanitizeDisplayName(value);
      if (sanitized) return sanitized;
    }
  }

  if (typeof decoded.email === "string") {
    const sanitized = sanitizeDisplayName(decoded.email);
    if (sanitized) return sanitized;
  }

  const fallbackFields = [
    decoded.UserName,
    decoded.username,
    decoded.unique_name,
    decoded.sub,
  ];

  for (const value of fallbackFields) {
    if (typeof value === "string") {
      const sanitized = sanitizeDisplayName(value);
      if (sanitized) return sanitized;
    }
  }

  return null;
}

function getUserInitials(name: string | null, email: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  if (email) {
    return email.slice(0, 2).toUpperCase();
  }

  return "U";
}

const MenuOne: React.FC<Props> = ({ props }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { openLoginPopup, handleLoginPopup } = useLoginPopup();
  const { openMenuMobile, handleMenuMobile } = useMenuMobile();
  const [openSubNavMobile, setOpenSubNavMobile] = useState<number | null>(null);
  const { openModalCart } = useModalCartContext();
  const { cartState } = useCart();
  const { openModalWishlist } = useModalWishlistContext();
  const { openModalSearch } = useModalSearchContext();

  const handleOpenSubNavMobile = (index: number) => {
    setOpenSubNavMobile(openSubNavMobile === index ? null : index);
  };
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [fixedHeader, setFixedHeader] = useState(false);
  const [lastScrollPosition, setLastScrollPosition] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<{ email: string; welcomeName: string | null } | null>(null);
  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      try {
        const decoded = jwtDecode<Record<string, unknown>>(token);
        const email = typeof decoded.email === "string" ? decoded.email : "";
        const welcomeName = getWelcomeName(decoded);

        setUser({
          email,
          welcomeName,
        });
        setIsLoggedIn(true);
      } catch (error) {
        console.error("Token decode error:", error);
        setIsLoggedIn(false);
        setUser(null);
      }
    } else {
      setIsLoggedIn(false);
      setUser(null);
    }
  }, []);
  const handleLogout = async () => {
    logout();
    setIsLoggedIn(false);
    setUser(null);
    localStorage.removeItem("user");
    window.location.href = "/login";
  };
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      setFixedHeader(scrollPosition > 0 && scrollPosition < lastScrollPosition);
      setLastScrollPosition(scrollPosition);
    };

    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [lastScrollPosition]);

  useEffect(() => {
    setAccountMenuOpen(false);
  }, [pathname]);

  const closeAccountMenu = () => {
    if (accountCloseTimer.current) {
      clearTimeout(accountCloseTimer.current);
      accountCloseTimer.current = null;
    }
    setAccountMenuOpen(false);
  };

  const openAccountMenuDesktop = () => {
    if (window.innerWidth < 1024) return;
    if (accountCloseTimer.current) {
      clearTimeout(accountCloseTimer.current);
      accountCloseTimer.current = null;
    }
    setAccountMenuOpen(true);
  };

  const scheduleCloseAccountMenuDesktop = () => {
    if (window.innerWidth < 1024) return;
    if (accountCloseTimer.current) {
      clearTimeout(accountCloseTimer.current);
    }
    accountCloseTimer.current = setTimeout(() => {
      setAccountMenuOpen(false);
      accountCloseTimer.current = null;
    }, 120);
  };

  const displayName = user?.welcomeName ?? null;
  const userInitials = getUserInitials(displayName, user?.email ?? "");

 // 1. Aapka function waisa hi hai jaisa aapne bheja tha
const renderAccountMenuContent = (onClose: () => void) => {
  return isLoggedIn ? (
    <>
    <div className="account-dropdown-header">
  {/* Yahan Initials ki jagah Icon laga diya hai */}
  <div className="account-dropdown-avatar">
     <Icon.User size={24} weight="duotone" />
  </div>
  
  <div className="account-dropdown-meta">
    <p className="account-dropdown-name">
      {displayName ? `Hi, ${displayName}` : "Welcome Back!"}
    </p>
    {user?.email && (
      <p className="account-dropdown-email">{user.email}</p>
    )}
  </div>
</div>
      <div className="account-dropdown-body">
        <Link href="/my-account" className="account-dropdown-item" onClick={onClose}>
          <span className="account-dropdown-item-icon">
            <Icon.SquaresFour size={18} weight="duotone" />
          </span>
          <span>My Account</span>
        </Link>
        <Link href="/wishlist" className="account-dropdown-item" onClick={onClose}>
          <span className="account-dropdown-item-icon">
            <Icon.Heart size={18} weight="duotone" />
          </span>
          <span>Wishlist</span>
        </Link>
        <div className="account-dropdown-divider" />
        <button
          type="button"
          onClick={() => {
            onClose();
            setShowLogoutModal(true);
          }}
          className="account-dropdown-item account-dropdown-item-danger"
        >
          <span className="account-dropdown-item-icon">
            <Icon.SignOut size={18} weight="duotone" />
          </span>
          <span>Logout</span>
        </button>
      </div>
    </>
  ) : (
    <div className="account-dropdown-body account-dropdown-body-guest">
      <p className="account-dropdown-guest-title text-center">Your Account</p>
      <p className="account-dropdown-guest-text">
        Sign in to manage orders, wishlist and profile.
      </p>
      <Link href="/login" className="account-dropdown-primary-btn" onClick={onClose}>
        Sign In
      </Link>
      <Link href="/register" className="account-dropdown-secondary-btn" onClick={onClose}>
        Create Account
      </Link>
    </div>
  );
};

// 2. Navbar ke andar jahan "User Icon" hai, wahan ye code use karein:
<button 
  className="user-profile-btn" 
  onClick={() => setAccountMenuOpen(!accountMenuOpen)}
>
  {isLoggedIn ? (
    // Login hone par initials ka circle dikhega
    <div className="avatar-circle-nav">
      {userInitials}
    </div>
  ) : (
    // Login na hone par icon dikhega
    <Icon.User size={24} />
  )}
</button>

  return (
    <>
      <div
  className={`header-menu style-one ${fixedHeader ? "fixed" : "absolute"} top-0 left-0 right-0 w-full md:h-[78px] h-[60px] border-b border-white ${props}`}
>
        <div className="container mx-auto h-full px-4 lg:px-6">
          <div className="header-main grid grid-cols-[1fr_auto_1fr] items-center h-full gap-3">
            <div className="header-left flex items-center justify-start min-w-0">
  <button
    type="button"
    className="menu-mobile-icon lg:hidden flex items-center justify-center w-10 h-10 -ml-1"
    onClick={handleMenuMobile}
    aria-label="Open menu"
  >
    <i className="icon-category text-2xl"></i>
  </button>
  <div className="hidden lg:flex flex-col justify-center min-w-0">
    <TenantLogo
      imageClassName="h-9 w-9 object-contain"
      textClassName="heading4 text-xl font-semibold tracking-tight"
      logoName="TopSaver"
    />
    {isLoggedIn && (
      <span className="text-[10px] text-gray-500 font-medium leading-none ml-18 mt-1">
        Welcome, {user?.welcomeName}
      </span>
    )}
  </div>
</div>

            <div className="header-center flex items-center justify-center min-w-0">
             <div className="lg:hidden flex flex-col items-center justify-center max-w-[220px]">
    <TenantLogo
      className="justify-center"
      imageClassName="h-9 w-9 object-contain"
      textClassName="heading4 text-base font-semibold tracking-tight"
      logoName="TopSaver"
    />
    {isLoggedIn && (
      <span className="text-[10px] text-gray-500 font-medium leading-none mt-0.5">
        Welcome, {user?.welcomeName}
      </span>
    )}
  </div>
              <div className="menu-main h-full hidden lg:block">
                <ul className="flex items-center gap-7 xl:gap-9 h-full">
                  <li className="h-full">
                    <Link
                      href="/"
                      className={`text-button-uppercase duration-300 h-full flex items-center justify-center ${pathname === "/" ? "active" : ""}`}
                    >
                      Home
                    </Link>
                  </li>
                  <li className="h-full relative">
                    <Link
                      href="/categories"
                      className={`text-button-uppercase duration-300 h-full flex items-center justify-center ${pathname.includes("/category") || pathname.includes("/categories") ? "active" : ""}`}
                    >
                      Categories
                    </Link>
                    <DynamicCategoryMegaMenu />
                  </li>
                  <li className="h-full relative">
                    <Link
                      href="#!"
                      className={`text-button-uppercase duration-300 h-full flex items-center justify-center ${pathname === "/cart" || pathname === "/checkout" || pathname === "/wishlist" ? "active" : ""}`}
                    >
                      Shop
                    </Link>
                    <div className="sub-menu absolute top-full left-1/2 -translate-x-1/2 min-w-[210px] py-3 px-5 bg-white rounded-b-xl border border-line/60">
                      <ul className="w-full">
                        <li>
                          <Link href="/categories" className="link text-secondary duration-300">
                            All Categories
                          </Link>
                        </li>
                        <li>
                          <Link
                            href="/cart"
                            className={`link text-secondary duration-300 ${pathname === "/cart" ? "active" : ""}`}
                          >
                            Shopping Cart
                          </Link>
                        </li>
                        <li>
                          <Link
                            href="/checkout"
                            className={`link text-secondary duration-300 ${pathname === "/checkout" ? "active" : ""}`}
                          >
                            Checkout
                          </Link>
                        </li>
                        <li>
                          <Link
                            href="/wishlist"
                            className={`link text-secondary duration-300 ${pathname === "/wishlist" ? "active" : ""}`}
                          >
                            Wishlist
                          </Link>
                        </li>
                        <li>
                          <Link
                            href="/my-account"
                            className={`link text-secondary duration-300 ${pathname === "/my-account" ? "active" : ""}`}
                          >
                            My Account
                          </Link>
                        </li>
                      </ul>
                    </div>
                  </li>
                  <li className="h-full relative">
                    <Link
                      href="/blog/list"
                      className={`text-button-uppercase duration-300 h-full flex items-center justify-center ${pathname.includes("/blog") ? "active" : ""}`}
                    >
                      Blog
                    </Link>
                  </li>
                  <li className="h-full relative">
                    <Link
                      href="#!"
                      className={`text-button-uppercase duration-300 h-full flex items-center justify-center ${pathname.includes("/pages/") ? "active" : ""}`}
                    >
                      Pages
                    </Link>
                    <div className="sub-menu absolute top-full left-1/2 -translate-x-1/2 min-w-[220px] py-3 px-5 bg-white rounded-b-xl border border-line/60">
                      <ul className="w-full">
                        <li>
                          <Link href="/pages/about" className={`link text-secondary duration-300 ${pathname === "/pages/about" ? "active" : ""}`}>
                            About Us
                          </Link>
                        </li>
                        <li>
                          <Link href="/pages/contact" className={`link text-secondary duration-300 ${pathname === "/pages/contact" ? "active" : ""}`}>
                            Contact Us
                          </Link>
                        </li>
                        <li>
                          <Link href="/pages/store-list" className={`link text-secondary duration-300 ${pathname === "/pages/store-list" ? "active" : ""}`}>
                            Store List
                          </Link>
                        </li>
                        <li>
                          <Link href="/pages/faqs" className={`link text-secondary duration-300 ${pathname === "/pages/faqs" ? "active" : ""}`}>
                            FAQs
                          </Link>
                        </li>
                       
                      </ul>
                    </div>
                  </li>
                </ul>
              </div>
            </div>

            {/* Right: action icons */}
                 <div className="header-right flex items-center justify-end gap-1 sm:gap-2 md:gap-3">
  <button
    type="button"
    className="header-action-btn header-search-desktop"
    onClick={() => router.push("/search-result")}
    title="Search"
    aria-label="Search"
  >
    <Icon.MagnifyingGlass size={24} />
  </button>

  <div className="relative user-icon header-action-btn" title="Account">
    {accountMenuOpen && (
      <div
        className="account-dropdown-backdrop lg:hidden"
        onClick={closeAccountMenu}
        aria-hidden="true"
      />
    )}

  <button
  type="button"
  className="flex items-center justify-center w-full h-full relative z-[1]"
  aria-label="Account menu"
  aria-expanded={accountMenuOpen}
  onMouseEnter={openAccountMenuDesktop}
  onMouseLeave={scheduleCloseAccountMenuDesktop}
  onClick={() => {
    if (window.innerWidth < 1024) {
      setAccountMenuOpen((prev) => !prev);
    }
  }}
>
 {isLoggedIn ? (
  <div
    className="flex items-center justify-center rounded-full font-bold text-[14px] text-white"
    style={{
      width: "32px",
      height: "32px",
      backgroundColor: "#000",
    }}
  >
    {userInitials}
  </div>
) : (
  <Icon.User size={24} />
)}
</button>

    <div
      className={`account-dropdown-panel ${accountMenuOpen ? "is-open" : ""}`}
      onMouseEnter={openAccountMenuDesktop}
      onMouseLeave={scheduleCloseAccountMenuDesktop}
    >
      <div
        className={`account-dropdown transition-all duration-300 ${
          accountMenuOpen
            ? "opacity-100 visible translate-y-0"
            : "opacity-0 invisible -translate-y-1 pointer-events-none"
        }`}
      >
        {renderAccountMenuContent(closeAccountMenu)}
      </div>
    </div>
  </div>

  <button
    type="button"
    className="cart-icon header-action-btn relative"
    onClick={openModalCart}
    title="Cart"
    aria-label="Cart"
  >
    <Icon.Handbag size={24} />
    <span className="quantity cart-quantity absolute -right-1 -top-1 text-[10px] text-white bg-black min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full font-medium">
      {cartState.cartArray.length}
    </span>
  </button>
</div>
       
          </div>
        </div>
      </div>
      <div id="menu-mobile" className={`${openMenuMobile ? "open" : ""}`}>
        <div className="menu-container bg-white h-full">
          <div className="container h-full">
            <div className="menu-main h-full overflow-hidden">
              <div className="heading py-2 relative flex items-center justify-center">
                <div
                  className="close-menu-mobile-btn absolute left-0 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-surface flex items-center justify-center cursor-pointer"
                  onClick={handleMenuMobile}
                >
                  <Icon.X size={14} />
                </div>
                <TenantLogo
                  className="justify-center"
                  textClassName="text-3xl font-semibold"
                  imageClassName="h-10 w-10 object-contain"
                />
              </div>

              <div className="list-nav mt-6">
                <ul>
                  <li>
                    <Link
                      href="/"
                      className="text-xl font-semibold flex items-center justify-between mt-5"
                    >
                      Home
                    </Link>
                  </li>

                  <li className={`${openSubNavMobile === 2 ? "open" : ""}`}>
                    <div
                      className="text-xl font-semibold flex items-center justify-between mt-5 cursor-pointer"
                      onClick={() => handleOpenSubNavMobile(2)}
                    >
                      Categories
                      <span className="text-right">
                        <Icon.CaretRight size={20} />
                      </span>
                    </div>
                    <DynamicCategoryMobileNav
                      onBack={() => handleOpenSubNavMobile(2)}
                    />
                  </li>

                  <li className={`${openSubNavMobile === 3 ? "open" : ""}`}>
                    <div
                      className="text-xl font-semibold flex items-center justify-between mt-5 cursor-pointer"
                      onClick={() => handleOpenSubNavMobile(3)}
                    >
                      Shop
                      <span className="text-right">
                        <Icon.CaretRight size={20} />
                      </span>
                    </div>
                    <div className="sub-nav-mobile">
                      <div
                        className="back-btn flex items-center gap-3 cursor-pointer"
                        onClick={() => handleOpenSubNavMobile(3)}
                      >
                        <Icon.CaretLeft />
                        Back
                      </div>
                      <div className="list-nav-item w-full pt-2 pb-6">
                        <ul className="w-full">
                          <li>
                            <Link
                              href="/categories"
                              className="nav-item-mobile"
                            >
                              All Categories
                            </Link>
                          </li>
                          <li>
                            <Link href="/cart" className="nav-item-mobile">
                              Shopping Cart
                            </Link>
                          </li>
                          <li>
                            <Link href="/checkout" className="nav-item-mobile">
                              Checkout
                            </Link>
                          </li>
                          <li>
                            <Link href="/wishlist" className="nav-item-mobile">
                              Wishlist
                            </Link>
                          </li>
                          <li>
                            <Link
                              href="/my-account"
                              className="nav-item-mobile"
                            >
                              My Account
                            </Link>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </li>

                  <li>
                    <Link
                      href="/blog/list"
                      className="text-xl font-semibold flex items-center justify-between mt-5"
                    >
                      Blog
                    </Link>
                  </li>

                  <li className={`${openSubNavMobile === 6 ? "open" : ""}`}>
                    <div
                      className="text-xl font-semibold flex items-center justify-between mt-5 cursor-pointer"
                      onClick={() => handleOpenSubNavMobile(6)}
                    >
                      Pages
                      <span className="text-right">
                        <Icon.CaretRight size={20} />
                      </span>
                    </div>
                    <div className="sub-nav-mobile">
                      <div
                        className="back-btn flex items-center gap-3 cursor-pointer"
                        onClick={() => handleOpenSubNavMobile(6)}
                      >
                        <Icon.CaretLeft />
                        Back
                      </div>
                      <div className="list-nav-item w-full pt-2 pb-6">
                        <ul className="w-full">
                          <li>
                            <Link href="/pages/terms-and-conditions" className="nav-item-mobile">
                              Terms & Conditions
                            </Link>
                          </li>
                          <li>
                            <Link href="/pages/privacy-policy" className="nav-item-mobile">
                              Privacy Policy
                            </Link>
                          </li>
                          <li>
                            <Link href="/pages/contact" className="nav-item-mobile">
                              Contact Us
                            </Link>
                          </li>
                          <li>
                            <Link href="/pages/faqs" className="nav-item-mobile">
                              FAQs
                            </Link>
                          </li>
                          <li>
                            <Link href="/pages/store-list" className="nav-item-mobile">
                              Store List
                            </Link>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="menu_bar fixed bg-white bottom-0 left-0 w-full h-[70px] sm:hidden z-[101]">
        <div className="menu_bar-inner grid grid-cols-3 items-center h-full">
          <Link
            href={"/"}
            className="menu_bar-link flex flex-col items-center gap-1"
          >
            <Icon.House weight="bold" className="text-2xl" />
            <span className="menu_bar-title caption2 font-semibold">Home</span>
          </Link>
          <Link
            href={"/categories"}
            className="menu_bar-link flex flex-col items-center gap-1"
          >
            <Icon.List weight="bold" className="text-2xl" />
            <span className="menu_bar-title caption2 font-semibold">
              Category
            </span>
          </Link>
          <Link
            href={"/cart"}
            className="menu_bar-link flex flex-col items-center gap-1"
          >
            <div className="icon relative">
              <Icon.Handbag weight="bold" className="text-2xl" />
              <span className="quantity cart-quantity absolute -right-1.5 -top-1.5 text-xs text-white bg-black w-4 h-4 flex items-center justify-center rounded-full">
                {cartState.cartArray.length}
              </span>
            </div>
            <span className="menu_bar-title caption2 font-semibold">Cart</span>
          </Link>
        </div>
      </div>

      {showLogoutModal && (
        <div
          className="logout-modal-overlay"
          onClick={() => setShowLogoutModal(false)}
          role="presentation"
        >
          <div
            className="logout-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-modal-title"
          >
            <div className="logout-modal-icon">
              <Icon.SignOut size={28} weight="duotone" />
            </div>
            <h3 id="logout-modal-title" className="logout-modal-title">
              Log out of your account?
            </h3>
            <p className="logout-modal-text">
              You will need to sign in again to access your dashboard and orders.
            </p>
            <div className="logout-modal-actions">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="logout-modal-btn logout-modal-btn-cancel"
              >
                Stay Signed In
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="logout-modal-btn bg-black logout-modal-btn-confirm"
              >
                Yes, Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MenuOne;
