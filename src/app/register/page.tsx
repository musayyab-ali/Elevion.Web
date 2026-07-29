"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import toast from "react-hot-toast";
import TopNavOne from "@/components/Header/TopNav/TopNavOne";
import MenuOne from "@/components/Header/Menu/MenuOne";
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import Footer from "@/components/Footer/Footer";
import * as Icon from "@phosphor-icons/react/dist/ssr";
import api, { getApiErrorMessage } from "@/lib/api";
import { checkUserIsUnique } from "@/lib/user-unique";

type SignUpData = {
  clientRole: number;
  userName: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneCode: string;
  isoCode: string;
  phoneNumber: string;
  password: string;
  confirmPassword: string;
};

type FieldUniqueState = {
  checking: boolean;
  isUnique: boolean | null;
  message: string;
};

const emptyUniqueState = (): FieldUniqueState => ({
  checking: false,
  isUnique: null,
  message: "",
});

type RegisterPayload = {
  ClientRole: number;
  UserName: string;
  FirstName: string;
  LastName: string;
  Email: string;
  PhoneCode: string;
  ISOCode: string;
  PhoneNumber: string;
  Password: string;
  ConfirmPassword: string;
};

const CLIENT_ROLE = 4;

const AUTH_BENEFITS = [
  {
    icon: Icon.ShoppingBag,
    title: "Track your orders",
    description: "View order history and delivery updates anytime.",
  },
  {
    icon: Icon.Heart,
    title: "Save your wishlist",
    description: "Keep favorite products in one place.",
  },
  {
    icon: Icon.ShieldCheck,
    title: "Secure checkout",
    description: "Your account details stay protected.",
  },
] as const;

const validateEmail = (email: string) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

/** PhoneInput stores dial-code + number; API wants local number only. */
function toLocalPhoneNumber(fullPhone: string, dialCode: string): string {
  let digits = fullPhone.replace(/\D/g, "");
  const code = dialCode.replace(/\D/g, "");

  if (code && digits.startsWith(code)) {
    digits = digits.slice(code.length);
  }

  if (digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  return digits;
}

function isRegisterSuccess(response: unknown): boolean {
  if (!response || typeof response !== "object") return true;

  const record = response as Record<string, unknown>;
  const body =
    record.data && typeof record.data === "object"
      ? (record.data as Record<string, unknown>)
      : record;

  const type = String(body.Type ?? body.type ?? "").toLowerCase();
  const status = Number(
    record.status ?? body.StatusCode ?? body.HttpStatusCode ?? 0,
  );

  if (type === "error" || type === "failure") return false;
  if (status >= 400) return false;

  return true;
}

const cookieOptions = {
  expires: 1,
  secure: process.env.NODE_ENV === "production",
  sameSite: "Strict" as const,
  path: "/",
};

const Register = () => {
  const router = useRouter();
  const [signUpData, setSignUpData] = useState<SignUpData>({
    clientRole: CLIENT_ROLE,
    userName: "",
    firstName: "",
    lastName: "",
    email: "",
    phoneCode: "92",
    isoCode: "PK",
    phoneNumber: "",
    password: "",
    confirmPassword: "",
  });
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [uniqueStatus, setUniqueStatus] = useState({
    username: emptyUniqueState(),
    email: emptyUniqueState(),
    phone: emptyUniqueState(),
  });

  const setFieldUnique = (
    field: "username" | "email" | "phone",
    patch: Partial<FieldUniqueState>,
  ) => {
    setUniqueStatus((prev) => ({
      ...prev,
      [field]: { ...prev[field], ...patch },
    }));
  };

  const verifyUsernameUnique = async (rawValue?: string) => {
    const value = (rawValue ?? signUpData.userName).trim();
    if (value.length < 5) {
      setFieldUnique("username", emptyUniqueState());
      return true;
    }

    setFieldUnique("username", { checking: true, message: "", isUnique: null });
    const result = await checkUserIsUnique(value, "username");
    setFieldUnique("username", {
      checking: false,
      isUnique: result.isUnique,
      message: result.message,
    });
    return result.isUnique;
  };

  const verifyEmailUnique = async (rawValue?: string) => {
    const value = (rawValue ?? signUpData.email).trim();
    if (!validateEmail(value)) {
      setFieldUnique("email", emptyUniqueState());
      return true;
    }

    setFieldUnique("email", { checking: true, message: "", isUnique: null });
    const result = await checkUserIsUnique(value, "email");
    setFieldUnique("email", {
      checking: false,
      isUnique: result.isUnique,
      message: result.message,
    });
    return result.isUnique;
  };

  const verifyPhoneUnique = async (rawPhone?: string, rawCode?: string) => {
    const phoneCode =
      (rawCode ?? signUpData.phoneCode).replace(/\D/g, "") || "92";
    const localPhone = toLocalPhoneNumber(
      rawPhone ?? signUpData.phoneNumber,
      phoneCode,
    );

    if (localPhone.length < 10 || localPhone.length > 15) {
      setFieldUnique("phone", emptyUniqueState());
      return true;
    }

    setFieldUnique("phone", { checking: true, message: "", isUnique: null });
    const result = await checkUserIsUnique(localPhone, "phone");
    setFieldUnique("phone", {
      checking: false,
      isUnique: result.isUnique,
      message: result.message,
    });
    return result.isUnique;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const userName = signUpData.userName.trim();
    const firstName = signUpData.firstName.trim();
    const lastName = signUpData.lastName.trim();
    const email = signUpData.email.trim();
    const phoneCode = signUpData.phoneCode.replace(/\D/g, "") || "92";
    const isoCode = (signUpData.isoCode || "PK").toUpperCase();
    const localPhone = toLocalPhoneNumber(signUpData.phoneNumber, phoneCode);

    if (signUpData.password !== signUpData.confirmPassword) {
      const msg = "Passwords do not match.";
      setError(msg);
      toast.error(msg);
      return;
    }

    if (!agreedToTerms) {
      const msg = "Please agree to the Terms of Service.";
      setError(msg);
      toast.error(msg);
      return;
    }

    if (userName.length < 5) {
      const msg = "Username must be at least 5 characters.";
      setError(msg);
      toast.error(msg);
      return;
    }

    if (!firstName || !lastName) {
      const msg = "Please enter your first and last name.";
      setError(msg);
      toast.error(msg);
      return;
    }

    if (!validateEmail(email)) {
      const msg = "Please enter a valid email address.";
      setError(msg);
      toast.error(msg);
      return;
    }

    if (localPhone.length < 10 || localPhone.length > 15) {
      const msg = "Please enter a valid phone number (10-15 digits).";
      setError(msg);
      toast.error(msg);
      return;
    }

    if (signUpData.password.length < 6) {
      const msg = "Password must be at least 6 characters.";
      setError(msg);
      toast.error(msg);
      return;
    }

    setLoading(true);
    try {
      const [usernameCheck, emailCheck, phoneCheck] = await Promise.all([
        checkUserIsUnique(userName, "username"),
        checkUserIsUnique(email, "email"),
        checkUserIsUnique(localPhone, "phone"),
      ]);

      setFieldUnique("username", {
        checking: false,
        isUnique: usernameCheck.isUnique,
        message: usernameCheck.message,
      });
      setFieldUnique("email", {
        checking: false,
        isUnique: emailCheck.isUnique,
        message: emailCheck.message,
      });
      setFieldUnique("phone", {
        checking: false,
        isUnique: phoneCheck.isUnique,
        message: phoneCheck.message,
      });

      if (
        !usernameCheck.isUnique ||
        !emailCheck.isUnique ||
        !phoneCheck.isUnique
      ) {
        const conflictMessage = !usernameCheck.isUnique
          ? usernameCheck.message
          : !emailCheck.isUnique
            ? emailCheck.message
            : phoneCheck.message;
        setError(conflictMessage);
        toast.error(conflictMessage);
        return;
      }

      const payload: RegisterPayload = {
        ClientRole: CLIENT_ROLE,
        UserName: userName,
        FirstName: firstName,
        LastName: lastName,
        Email: email,
        PhoneCode: phoneCode,
        ISOCode: isoCode,
        PhoneNumber: localPhone,
        Password: signUpData.password,
        ConfirmPassword: signUpData.confirmPassword,
      };

      const registerRes = await api.post("/api/v1/Account/Register", payload);

      if (!isRegisterSuccess(registerRes)) {
        throw new Error("Registration failed. Please check your details.");
      }

      Cookies.set(
        "userRegData",
        JSON.stringify({
          username: payload.UserName,
          email: payload.Email,
          phoneNumber: payload.PhoneNumber,
          phoneCode: payload.PhoneCode,
        }),
        cookieOptions,
      );

      Cookies.set("registerEmail", payload.Email, cookieOptions);

      if (typeof window !== "undefined") {
        sessionStorage.setItem("regPassword", signUpData.password);
      }

      try {
        await api.post("/api/v1/Account/SendOTP", {
          UserName: payload.UserName,
          Email: payload.Email,
          PhoneNumber: payload.PhoneNumber,
          PhoneCode: payload.PhoneCode,
        });
      } catch (otpErr) {
        const otpErrorMessage = getApiErrorMessage(
          otpErr,
          "Account created but OTP could not be sent. Please resend OTP on the next page.",
        );
        toast.error(otpErrorMessage);
        setError(otpErrorMessage);
        setTimeout(() => {
          router.push(
            `/register/verify-otp?email=${encodeURIComponent(payload.Email)}`,
          );
        }, 1500);
        return;
      }

      toast.success("Registration successful! OTP sent on Email.");
      setSuccess("Registration successful! Redirecting to verify OTP...");
      setTimeout(() => {
        router.push(
          `/register/verify-otp?email=${encodeURIComponent(payload.Email)}`,
        );
      }, 1000);
    } catch (err) {
      const errorMessage = getApiErrorMessage(
        err,
        "Registration failed. Please check your details and try again.",
      );
      toast.error(errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <TopNavOne
        props="style-one bg-black"
        slogan="New customers save 10% with the code GET10"
      />
      <div id="header" className="relative w-full">
        <MenuOne props="bg-transparent" />
        <Breadcrumb
          heading="Create An Account"
          subHeading="Create An Account"
        />
      </div>

      <section className="register-block auth-page md:py-20 py-10">
        <div className="container px-4 sm:px-6">
          <div className="auth-page-card">
            <div className="auth-page-grid">
              <div className="auth-page-form">
                <span className="auth-page-badge">Get Started</span>
                <h1 className="auth-page-title heading3">Create your account</h1>
                <p className="auth-page-subtitle caption1 text-secondary">
                  Register with your details. We&apos;ll send an OTP to verify
                  your email.
                </p>

                <form className="auth-form" onSubmit={handleSubmit}>
                  {error && (
                    <div className="auth-alert is-error" role="alert">
                      <Icon.WarningCircle size={18} weight="fill" />
                      <span>{error}</span>
                    </div>
                  )}
                  {success && (
                    <div className="auth-alert is-success" role="status">
                      <Icon.CheckCircle size={18} weight="fill" />
                      <span>{success}</span>
                    </div>
                  )}

                  <div className="auth-field">
                    <label htmlFor="userName" className="auth-label">
                      Username
                    </label>
                    <div className="auth-input-wrap">
                      <Icon.User size={18} className="auth-input-icon" />
                      <input
                        className="auth-input"
                        id="userName"
                        type="text"
                        placeholder="Choose a username"
                        required
                        value={signUpData.userName}
                        onChange={(e) => {
                          setSignUpData((prev) => ({
                            ...prev,
                            userName: e.target.value,
                          }));
                          setFieldUnique("username", emptyUniqueState());
                        }}
                        onBlur={() => {
                          void verifyUsernameUnique();
                        }}
                      />
                    </div>
                    {uniqueStatus.username.checking && (
                      <p className="caption2 text-secondary mt-1">
                        Checking username...
                      </p>
                    )}
                    {!uniqueStatus.username.checking &&
                      uniqueStatus.username.message && (
                        <p
                          className={`caption2 mt-1 ${
                            uniqueStatus.username.isUnique
                              ? "text-green"
                              : "text-red"
                          }`}
                        >
                          {uniqueStatus.username.message}
                        </p>
                      )}
                  </div>

                  <div className="auth-field-row">
                    <div className="auth-field">
                      <label htmlFor="firstName" className="auth-label">
                        First Name
                      </label>
                      <div className="auth-input-wrap">
                        <Icon.UserCircle size={18} className="auth-input-icon" />
                        <input
                          className="auth-input"
                          id="firstName"
                          type="text"
                          placeholder="First name"
                          required
                          value={signUpData.firstName}
                          onChange={(e) => {
                            setSignUpData((prev) => ({
                              ...prev,
                              firstName: e.target.value,
                            }));
                          }}
                        />
                      </div>
                    </div>

                    <div className="auth-field">
                      <label htmlFor="lastName" className="auth-label">
                        Last Name
                      </label>
                      <div className="auth-input-wrap">
                        <Icon.UserCircle size={18} className="auth-input-icon" />
                        <input
                          className="auth-input"
                          id="lastName"
                          type="text"
                          placeholder="Last name"
                          required
                          value={signUpData.lastName}
                          onChange={(e) => {
                            setSignUpData((prev) => ({
                              ...prev,
                              lastName: e.target.value,
                            }));
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="auth-field">
                    <label htmlFor="email" className="auth-label">
                      Email Address
                    </label>
                    <div className="auth-input-wrap">
                      <Icon.EnvelopeSimple size={18} className="auth-input-icon" />
                      <input
                        className="auth-input"
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        required
                        value={signUpData.email}
                        onChange={(e) => {
                          setSignUpData((prev) => ({
                            ...prev,
                            email: e.target.value,
                          }));
                          setFieldUnique("email", emptyUniqueState());
                        }}
                        onBlur={() => {
                          void verifyEmailUnique();
                        }}
                      />
                    </div>
                    {uniqueStatus.email.checking && (
                      <p className="caption2 text-secondary mt-1">
                        Checking email...
                      </p>
                    )}
                    {!uniqueStatus.email.checking &&
                      uniqueStatus.email.message && (
                        <p
                          className={`caption2 mt-1 ${
                            uniqueStatus.email.isUnique
                              ? "text-green"
                              : "text-red"
                          }`}
                        >
                          {uniqueStatus.email.message}
                        </p>
                      )}
                  </div>

                  <div className="auth-field auth-phone-field">
                    <label htmlFor="phoneNumber" className="auth-label">
                      Phone Number
                    </label>
                    <PhoneInput
                      country={signUpData.isoCode.toLowerCase()}
                      value={signUpData.phoneNumber}
                      onChange={(value: string, country: object) => {
                        if (
                          !("dialCode" in country) ||
                          !("countryCode" in country)
                        ) {
                          return;
                        }
                        const data = country as {
                          dialCode: string;
                          countryCode: string;
                        };
                        setSignUpData((prev) => ({
                          ...prev,
                          phoneCode: data.dialCode,
                          isoCode: data.countryCode.toUpperCase(),
                          phoneNumber: value || "",
                        }));
                        setFieldUnique("phone", emptyUniqueState());
                      }}
                      inputProps={{
                        id: "phoneNumber",
                        name: "phoneNumber",
                        required: true,
                        onBlur: () => {
                          void verifyPhoneUnique();
                        },
                      }}
                      containerClass="w-full"
                      enableSearch
                      disableSearchIcon
                      searchPlaceholder="Search country"
                    />
                    {uniqueStatus.phone.checking && (
                      <p className="caption2 text-secondary mt-1">
                        Checking phone number...
                      </p>
                    )}
                    {!uniqueStatus.phone.checking &&
                      uniqueStatus.phone.message && (
                        <p
                          className={`caption2 mt-1 ${
                            uniqueStatus.phone.isUnique
                              ? "text-green"
                              : "text-red"
                          }`}
                        >
                          {uniqueStatus.phone.message}
                        </p>
                      )}
                  </div>

                  <div className="auth-field-row">
                    <div className="auth-field">
                      <label htmlFor="password" className="auth-label">
                        Password
                      </label>
                      <div className="auth-input-wrap">
                        <Icon.Lock size={18} className="auth-input-icon" />
                        <input
                          className="auth-input"
                          id="password"
                          type="password"
                          placeholder="Min. 6 characters"
                          required
                          value={signUpData.password}
                          onChange={(e) => {
                            setSignUpData((prev) => ({
                              ...prev,
                              password: e.target.value,
                            }));
                          }}
                        />
                      </div>
                    </div>

                    <div className="auth-field">
                      <label htmlFor="confirmPassword" className="auth-label">
                        Confirm Password
                      </label>
                      <div className="auth-input-wrap">
                        <Icon.LockKey size={18} className="auth-input-icon" />
                        <input
                          className="auth-input"
                          id="confirmPassword"
                          type="password"
                          placeholder="Re-enter password"
                          required
                          value={signUpData.confirmPassword}
                          onChange={(e) => {
                            setSignUpData((prev) => ({
                              ...prev,
                              confirmPassword: e.target.value,
                            }));
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="auth-terms">
                    <div className="block-input">
                      <input
                        type="checkbox"
                        name="remember"
                        id="remember"
                        checked={agreedToTerms}
                        onChange={(e) => setAgreedToTerms(e.target.checked)}
                      />
                      <Icon.CheckSquare
                        size={20}
                        weight="fill"
                        className="icon-checkbox"
                      />
                    </div>
                    <label htmlFor="remember" className="cursor-pointer">
                      I agree to the{" "}
                      <Link href="/pages/terms-and-conditions">
                        Terms of Service
                      </Link>
                    </label>
                  </div>

                  <div className="auth-submit">
                    <button
                      title="Register your Account"
                      type="submit"
                      className="button-main bg-black text-white cursor-pointer hover:text-black transition-all duration-300"
                      disabled={loading}
                    >
                      {loading ? "Creating account..." : "Create Account"}
                    </button>
                  </div>
                </form>
              </div>

              <aside className="auth-page-aside">
                <div className="auth-aside-content">
                  <h2 className="auth-aside-title">Already have an account?</h2>
                  <p className="auth-aside-text">
                    Welcome back. Sign in to access orders, wishlist, and your
                    personalized shopping experience.
                  </p>

                  <ul className="auth-benefits">
                    {AUTH_BENEFITS.map((item) => {
                      const BenefitIcon = item.icon;
                      return (
                        <li key={item.title} className="auth-benefit-item">
                          <span className="auth-benefit-icon">
                            <BenefitIcon size={18} weight="duotone" />
                          </span>
                          <div>
                            <p className="auth-benefit-title">{item.title}</p>
                            <p className="auth-benefit-desc">
                              {item.description}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>

                  <div className="auth-aside-action">
                    <button
                      type="button"
                      title="Go to Login Page"
                      onClick={() => router.push("/login")}
                      className="button-main cursor-pointer transition-all duration-300"
                    >
                      Sign In
                    </button>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
};

export default Register;
