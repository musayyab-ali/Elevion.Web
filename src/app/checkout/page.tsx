"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import TopNavOne from "@/components/Header/TopNav/TopNavOne";
import MenuOne from "@/components/Header/Menu/MenuOne";
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import Footer from "@/components/Footer/Footer";
import * as Icon from "@phosphor-icons/react/dist/ssr";
import { useCart } from "@/context/CartContext";
import api from "@/lib/api";
import {
  formatRsPrice,
  getCartShippingPref,
  resolveCartDisplayTotals,
} from "@/lib/cart";
import {
  buildCreateOrderPayload,
  createOrder,
  extractOrderId,
  extractSaleCampaignId,
  applyGuestAuthFromOrderResponse,
  clearOrderFlowStorage,
  saveOrderSaleCampaignId,
} from "@/lib/order";
import { getApiErrorMessage } from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";
import { getPendingPromoCode } from "@/lib/promo";
import {
  buildSaveAddressPayloadFromCheckout,
  CustomerAddress,
  fetchCustomerAddresses,
  saveCustomerAddress,
} from "@/lib/customer-address";
import ModalSavedAddresses from "@/components/Modal/ModalSavedAddresses";
import toast from "react-hot-toast";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import {
  CampaignType,
  getCampaignDiscountLabel,
  getCartCampaignDiscounts,
} from "@/lib/discount";

type SelectOption = { Value: string; Text: string };

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

function normalizeDialCode(code: unknown): string {
  return String(code ?? "").replace(/\D/g, "") || "92";
}

const Checkout = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { cartState, fetchCart, clearCart } = useCart();

  const [countries, setCountries] = useState<SelectOption[]>([]);
  const [states, setStates] = useState<SelectOption[]>([]);
  const [cities, setCities] = useState<SelectOption[]>([]);
  const [areas, setAreas] = useState<SelectOption[]>([]);
  const [branches, setBranches] = useState<SelectOption[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [pendingPromo, setPendingPromo] = useState<string | null>(null);
  const [savedAddresses, setSavedAddresses] = useState<CustomerAddress[]>([]);
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(
    null,
  );
  const [savingAddress, setSavingAddress] = useState(false);
  const [addressSavedPopup, setAddressSavedPopup] = useState<string | null>(
    null,
  );

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    phoneCode: "92",
    address: "",
    postalCode: "",
    countryId: "",
    stateId: "",
    cityId: "",
    cityName: "",
    areaId: "",
    branchId: "",
    specialInstructions: "",
    deliveryInstructions: "",
    isGiftOrder: false,
    deliveryOption: "",
    isoCode: "PK",
    deliveryDate: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
    billingFullName: "",
    billingEmail: "",
    billingPhone: "",
    billingSameAsShipping: true,
    isAddNewAddress: true,
    addressBookId: 0,
    longitude: "",
    latitude: "",
  });

  const linesNet = cartState.cartArray.reduce(
    (sum, item) => sum + (item.lineTotal || 0),
    0,
  );
  const linesGross = cartState.cartArray.reduce((sum, item) => {
    const originUnit = item.originPrice || item.price || 0;
    return sum + originUnit * (item.quantity || 1);
  }, 0);
  const displayTotals = resolveCartDisplayTotals({
    linesNet,
    linesGross,
    subTotal: cartState.subTotal || 0,
    totalDiscount:
      cartState.totalItems > 0 || cartState.subTotal > 0
        ? cartState.totalDiscount || 0
        : Number(searchParams.get("discount")) || 0,
    netTotal: cartState.netTotal || 0,
  });
  const subTotal = displayTotals.subTotal;
  const discount = displayTotals.discount;
  const campaignDiscounts = getCartCampaignDiscounts(
    cartState.cartArray,
    discount,
  );
  const netTotal = displayTotals.netTotal;
  // Cart API owns delivery pricing; the URL value is only a fallback.
  const hasCartItems = cartState.cartArray.length > 0;
  const minimumOrderValue = Math.max(
    0,
    Number(cartState.minimumOrderValue) || 0,
  );
  const apiDeliveryCharges = Math.max(
    0,
    Number(cartState.deliveryCharges) || 0,
  );
  const qualifiesForFreeShipping =
    hasCartItems && minimumOrderValue > 0 && netTotal >= minimumOrderValue;
  const ship = !hasCartItems
    ? 0
    : qualifiesForFreeShipping
      ? 0
      : apiDeliveryCharges || Number(searchParams.get("ship")) || 0;
  const orderTotal = netTotal + ship;

  useEffect(() => {
    void fetchCart();
    setPendingPromo(getPendingPromoCode());
  }, [fetchCart]);

  useEffect(() => {
    const prefillProfile = async () => {
      if (!isAuthenticated()) return;

      try {
        const res = await api.get<any>("/api/v1/Customer/GetProfile");
        const profile = (res.data as any)?.Data;
        if (!profile) return;

        const fullName = String(profile.FullName || "").trim();

        setForm((prev) => ({
          ...prev,
          fullName: prev.fullName || fullName,
          email: prev.email || profile.Email || "",
          phone: prev.phone || profile.PhoneNumber || "",
          phoneCode: normalizeDialCode(profile.PhoneCode || prev.phoneCode),
          isoCode: String(
            profile.ISOCode || prev.isoCode || "PK",
          ).toUpperCase(),
        }));
      } catch (error) {
        console.error("Failed to prefill checkout profile:", error);
      }
    };

    void prefillProfile();
  }, []);

  useEffect(() => {
    const getCountries = async () => {
      try {
        const res = await api.get("/api/v1/Common/countries");
        setCountries(Array.isArray(res.data?.Data) ? res.data.Data : []);
      } catch (error) {
        console.error("Failed to fetch countries:", error);
      }
    };
    void getCountries();
  }, []);

  useEffect(() => {
    const pref = getCartShippingPref();
    if (!pref?.countryId) return;

    setForm((prev) => {
      if (prev.countryId) return prev;
      return {
        ...prev,
        countryId: pref.countryId,
        stateId: pref.stateId || "",
      };
    });

    void (async () => {
      try {
        const res = await api.get("/api/v1/Common/states", {
          params: { CountryId: pref.countryId },
        });
        setStates(Array.isArray(res.data?.Data) ? res.data.Data : []);
        if (pref.stateId) {
          const citiesRes = await api.get("/api/v1/Common/cities", {
            params: { StateId: pref.stateId },
          });
          setCities(
            Array.isArray(citiesRes.data?.Data) ? citiesRes.data.Data : [],
          );
        }
      } catch (error) {
        console.error("Failed to prefill checkout states:", error);
      }
    })();
  }, []);

  const fetchStates = async (countryId: string) => {
    if (!countryId) return;
    try {
      const res = await api.get("/api/v1/Common/states", {
        params: { CountryId: countryId },
      });
      setStates(Array.isArray(res.data?.Data) ? res.data.Data : []);
    } catch (error) {
      console.error("Failed to fetch states:", error);
    }
  };

  const fetchCities = async (stateId: string) => {
    if (!stateId) return;
    try {
      const res = await api.get("/api/v1/Common/cities", {
        params: { StateId: stateId },
      });
      setCities(Array.isArray(res.data?.Data) ? res.data.Data : []);
    } catch (error) {
      console.error("Failed to fetch cities:", error);
    }
  };

  const fetchAreas = async (cityId: string) => {
    if (!cityId) return;
    try {
      const res = await api.get("/api/v1/Common/areas", {
        params: { CityId: cityId },
      });
      setAreas(Array.isArray(res.data?.Data) ? res.data.Data : []);
    } catch (error) {
      console.error("Failed to fetch areas:", error);
    }
  };

  const fetchBranches = async (cityId: string) => {
    if (!cityId) return;
    try {
      const res = await api.get("/api/v1/Common/branches", {
        params: { CityId: cityId },
      });
      const list = Array.isArray(res.data?.Data) ? res.data.Data : [];
      setBranches(list);
      if (list.length > 0) {
        setForm((prev) =>
          prev.branchId ? prev : { ...prev, branchId: String(list[0].Value) },
        );
      }
    } catch (error) {
      console.error("Failed to fetch branches:", error);
    }
  };

  const applySavedAddress = async (
    address: CustomerAddress,
    options?: { silent?: boolean },
  ) => {
    setSelectedAddressId(address.AddressBookId);
    setAddressModalOpen(false);

    const countryId = address.CountryId ? String(address.CountryId) : "";
    const stateId = address.StateId ? String(address.StateId) : "";
    const cityId = address.CityId ? String(address.CityId) : "";
    const areaId = address.AreaId ? String(address.AreaId) : "";

    setForm((prev) => ({
      ...prev,
      fullName: address.FullName || prev.fullName,
      phone: address.PhoneNumber || prev.phone,
      address: address.Address || "",
      countryId,
      stateId,
      cityId,
      phoneCode: normalizeDialCode(address.PhoneCode) || prev.phoneCode,
      cityName: address.CityName || prev.cityName,
      areaId,
      addressBookId: address.AddressBookId || 0,
      isAddNewAddress: false,
      longitude: address.Longitude || "0",
      latitude: address.Latitude || "0",
    }));

    if (countryId) await fetchStates(countryId);
    if (stateId) await fetchCities(stateId);
    if (cityId) {
      await fetchAreas(cityId);
      await fetchBranches(cityId);
    }

    if (!options?.silent) {
      toast.success("Address filled in the form.");
    }
  };

  const startNewAddress = () => {
    setSelectedAddressId(null);
    setAddressModalOpen(false);
    setForm((prev) => ({
      ...prev,
      address: "",
      postalCode: "",
      areaId: "",
      addressBookId: 0,
      isAddNewAddress: true,
      longitude: "",
      latitude: "",
    }));
  };

  // Ticking the box has to detach the form from the saved address, otherwise
  // addressBookId stays set and the create-address call is skipped on submit.
  const handleSaveAddressToggle = (checked: boolean) => {
    if (!checked) {
      setForm((prev) => ({ ...prev, isAddNewAddress: false }));
      return;
    }

    setSelectedAddressId(null);
    setForm((prev) => ({
      ...prev,
      addressBookId: 0,
      isAddNewAddress: true,
    }));
  };

  const handleSaveAddressNow = async () => {
    if (savingAddress) return;

    if (!isAuthenticated()) {
      toast.error("Please sign in to save an address to your address book.");
      return;
    }

    const missing = [
      !form.fullName.trim() && "full name",
      !form.phone.trim() && "phone number",
      !form.address.trim() && "address",
      !form.countryId && "country",
      !form.stateId && "state",
      !form.cityId && "city",
    ].filter(Boolean);

    if (missing.length > 0) {
      toast.error(`Please fill your ${missing.join(", ")} first.`);
      return;
    }

    setSavingAddress(true);
    try {
      const nameParts = form.fullName.trim().split(/\s+/).filter(Boolean);

      const saved = await saveCustomerAddress(
        buildSaveAddressPayloadFromCheckout({
          addressBookId: 0,
          fullName: form.fullName,
          firstName: nameParts[0] || form.fullName,
          lastName: nameParts.slice(1).join(" "),
          phone: form.phone,
          phoneCode: form.phoneCode,
          address: form.address,
          postalCode: form.postalCode,
          cityId: form.cityId,
          countryId: form.countryId,
          stateId: form.stateId,
          areaId: form.areaId,
          longitude: form.longitude,
          latitude: form.latitude,
          isDefault: savedAddresses.length === 0,
        }),
      );

      const refreshed = await fetchCustomerAddresses({
        pageSize: 50,
        pageNumber: 1,
      }).catch(() => [] as CustomerAddress[]);

      if (refreshed.length > 0) {
        setSavedAddresses(refreshed);
      } else if (saved) {
        setSavedAddresses((current) => [...current, saved]);
      }

      const savedId = Number(saved?.AddressBookId) || 0;
      if (savedId > 0) {
        setSelectedAddressId(savedId);
      }

      // Already stored, so order submit must not create a duplicate entry.
      setForm((prev) => ({
        ...prev,
        addressBookId: savedId,
        isAddNewAddress: false,
      }));

      setAddressSavedPopup(
        form.address.trim() || "Your address has been added to your address book.",
      );
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not save this address."));
    } finally {
      setSavingAddress(false);
    }
  };

  useEffect(() => {
    const loadAddressesForCheckout = async () => {
      if (!isAuthenticated()) {
        setSavedAddresses([]);
        setAddressModalOpen(false);
        return;
      }

      setLoadingAddresses(true);
      try {
        const list = await fetchCustomerAddresses({
          pageSize: 50,
          pageNumber: 1,
        });
        setSavedAddresses(list);

        if (list.length > 0) {
          const defaultAddress =
            list.find((address) => address.IsDefault) || list[0];
          await applySavedAddress(defaultAddress, { silent: true });
          // Modal stays closed — user can open "Choose Address" if needed.
          setAddressModalOpen(false);
        }
      } catch (error) {
        console.error("Failed to load checkout addresses:", error);
        setSavedAddresses([]);
        setAddressModalOpen(false);
        toast.error(
          getApiErrorMessage(error, "Could not load saved addresses."),
        );
      } finally {
        setLoadingAddresses(false);
      }
    };

    // Small delay so auth cookies are ready after navigation
    const timer = window.setTimeout(() => {
      void loadAddressesForCheckout();
    }, 50);

    return () => window.clearTimeout(timer);
  }, []);

  const updateForm = (field: string, value: string | boolean | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const getVariantsLabel = (product: (typeof cartState.cartArray)[0]) => {
    if (!product.apiItem) return product.selectedSize || "";
    return (
      product.apiItem.ProductVariants?.replace(/,/g, ", ") ||
      product.apiItem.cartItemVariantList
        ?.map((v) => `${v.VariantGroup}: ${v.VariantName}`)
        .join(" · ") ||
      ""
    );
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (cartState.cartArray.length === 0) {
      toast.error("Your cart is empty. Add products before checkout.");
      return;
    }

    if (
      !form.billingSameAsShipping &&
      (!form.billingFullName || !form.billingEmail || !form.billingPhone)
    ) {
      toast.error("Please fill all billing details.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = buildCreateOrderPayload(form);
      const response = await createOrder(payload);
      const newOrderId =
        extractOrderId(response.Data) ?? extractOrderId(response);
      const saleCampaignId =
        extractSaleCampaignId(response.Data) ?? extractSaleCampaignId(response);

      if (newOrderId && saleCampaignId) {
        saveOrderSaleCampaignId(newOrderId, saleCampaignId);
      }

      let guestLoggedIn = false;
      if (!isAuthenticated()) {
        guestLoggedIn = applyGuestAuthFromOrderResponse(response);
      }

      const canSaveAddress =
        (isAuthenticated() || guestLoggedIn) &&
        form.addressBookId === 0 &&
        form.isAddNewAddress;

      if (canSaveAddress) {
        try {
          const nameParts = String(form.fullName || "")
            .trim()
            .split(/\s+/)
            .filter(Boolean);

          await saveCustomerAddress(
            buildSaveAddressPayloadFromCheckout({
              addressBookId: 0,
              fullName: form.fullName,
              firstName: nameParts[0] || form.fullName,
              lastName: nameParts.slice(1).join(" "),
              phone: form.phone,
              phoneCode: form.phoneCode,
              address: form.address,
              postalCode: form.postalCode,
              cityId: form.cityId,
              countryId: form.countryId,
              stateId: form.stateId,
              areaId: form.areaId,
              longitude: form.longitude,
              latitude: form.latitude,
              isDefault: savedAddresses.length === 0,
            }),
          );
          toast.success("Address saved to your address book.");
        } catch (addressError) {
          console.error("Failed to save customer address:", addressError);
          toast.error(
            getApiErrorMessage(
              addressError,
              "Order placed, but address could not be saved.",
            ),
          );
        }
      }

      toast.success(
        guestLoggedIn
          ? "Order created successfully! You're now logged in."
          : response.Message || "Order created successfully!",
      );

      clearCart();
      clearOrderFlowStorage({ keepPendingPromo: true });
      if (typeof window !== "undefined") {
        sessionStorage.setItem("clear_cart_after_order", "1");
      }

      if (newOrderId) {
        router.push(`/order/${newOrderId}?pay=1`);
      } else {
        toast.error(
          "Order was created but order ID was missing. Please check My Account → Orders.",
        );
        router.push("/my-account");
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to create order."));
    } finally {
      setSubmitting(false);
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
        <Breadcrumb heading="Checkout" subHeading="Checkout" />
      </div>

      <div className="checkout-page md:py-20 py-10">
        <div className="container">
          <div className="checkout-layout">
            <div className="checkout-form-card">
              <div className="checkout-form-head">
                <span className="checkout-badge">Secure Checkout</span>
                <h1 className="heading3 checkout-form-title">
                  Shipping Information
                </h1>
                <p className="text-secondary checkout-form-subtitle">
                  Complete your details below. Required fields are marked with
                  *.
                </p>
              </div>

              <form onSubmit={handleCreateOrder}>
                <div className="checkout-section">
                  <h2 className="checkout-section-title">
                    <span className="checkout-section-icon">
                      <Icon.User size={18} weight="bold" />
                    </span>
                    Contact Information
                  </h2>
                  <div className="checkout-field-grid cols-2">
                    <div className="checkout-field full-width">
                      <label className="checkout-label" htmlFor="fullName">
                        Full Name *
                      </label>
                      <input
                        id="fullName"
                        className="checkout-input"
                        type="text"
                        placeholder="John Doe"
                        value={form.fullName}
                        onChange={(e) => updateForm("fullName", e.target.value)}
                        required
                      />
                    </div>
                    <div className="checkout-field">
                      <label className="checkout-label" htmlFor="email">
                        Email Address *
                      </label>
                      <input
                        id="email"
                        className="checkout-input"
                        type="email"
                        placeholder="you@example.com"
                        value={form.email}
                        onChange={(e) => updateForm("email", e.target.value)}
                        required
                      />
                    </div>
                    <div className="checkout-field checkout-phone-field">
                      <label className="checkout-label" htmlFor="phone">
                        Phone Number *
                      </label>
                      <PhoneInput
                        country={String(form.isoCode || "PK").toLowerCase()}
                        value={`+${form.phoneCode || "92"}${form.phone || ""}`}
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

                          const dial = data.dialCode;
                          let localNum = value;

                          if (localNum.startsWith(dial)) {
                            localNum = localNum.slice(dial.length);
                          } else if (localNum.startsWith("+" + dial)) {
                            localNum = localNum.slice(dial.length + 1);
                          }

                          localNum = localNum.replace(/\D/g, "");

                          if (localNum.startsWith("0")) {
                            localNum = localNum.replace(/^0+/, "");
                          }

                          setForm((prev) => ({
                            ...prev,
                            phoneCode: normalizeDialCode(dial),
                            isoCode: data.countryCode.toUpperCase(),
                            phone: localNum,
                          }));
                        }}
                        inputProps={{
                          id: "phone",
                          name: "phone",
                          required: true,
                        }}
                        containerClass="w-full"
                        enableSearch
                        disableSearchIcon
                        searchPlaceholder="Search country"
                      />
                    </div>
                  </div>
                </div>

                <div className="checkout-section">
                  <h2 className="checkout-section-title">
                    <span className="checkout-section-icon">
                      <Icon.MapPin size={18} weight="bold" />
                    </span>
                    Shipping Address
                  </h2>

                  {isAuthenticated() && savedAddresses.length > 0 && (
                    <div className="checkout-address-toolbar">
                      <p className="checkout-address-hint">
                        {selectedAddressId
                          ? "Default/saved address applied. Choose another if needed."
                          : "You have saved addresses available."}
                      </p>
                      <button
                        type="button"
                        className="checkout-address-new-btn"
                        onClick={() => setAddressModalOpen(true)}
                      >
                        <Icon.MapPin size={14} weight="bold" />
                        Choose Address
                      </button>
                    </div>
                  )}

                  <div className="checkout-field-grid cols-2">
                    <div className="checkout-field full-width">
                      <label className="checkout-label" htmlFor="countryId">
                        Country *
                      </label>
                      <div className="checkout-select-wrap">
                        <select
                          id="countryId"
                          className="checkout-select"
                          value={form.countryId}
                          onChange={(e) => {
                            const countryId = e.target.value;
                            updateForm("countryId", countryId);
                            updateForm("stateId", "");
                            updateForm("cityId", "");
                            updateForm("cityName", "");
                            setStates([]);
                            setCities([]);
                            setAreas([]);
                            setBranches([]);
                            void fetchStates(countryId);
                          }}
                          required
                        >
                          <option value="">Choose Country</option>
                          {countries.map((country) => (
                            <option
                              key={String(country.Value)}
                              value={String(country.Value)}
                            >
                              {country.Text}
                            </option>
                          ))}
                        </select>
                        <Icon.CaretDown
                          size={14}
                          className="checkout-select-icon"
                        />
                      </div>
                    </div>

                    <div className="checkout-field">
                      <label className="checkout-label" htmlFor="stateId">
                        State *
                      </label>
                      <div className="checkout-select-wrap">
                        <select
                          id="stateId"
                          className="checkout-select"
                          value={form.stateId}
                          onChange={(e) => {
                            const stateId = e.target.value;
                            updateForm("stateId", stateId);
                            updateForm("cityId", "");
                            updateForm("cityName", "");
                            setCities([]);
                            setAreas([]);
                            setBranches([]);
                            void fetchCities(stateId);
                          }}
                          required
                        >
                          <option value="">Choose State</option>
                          {states.map((state) => (
                            <option
                              key={String(state.Value)}
                              value={String(state.Value)}
                            >
                              {state.Text}
                            </option>
                          ))}
                        </select>
                        <Icon.CaretDown
                          size={14}
                          className="checkout-select-icon"
                        />
                      </div>
                    </div>

                    <div className="checkout-field">
                      <label className="checkout-label" htmlFor="cityId">
                        City *
                      </label>
                      <div className="checkout-select-wrap">
                        <select
                          id="cityId"
                          className="checkout-select"
                          value={form.cityId}
                          onChange={(e) => {
                            const cityId = e.target.value;
                            const city = cities.find(
                              (c) => String(c.Value) === cityId,
                            );
                            updateForm("cityId", cityId);
                            updateForm("cityName", city?.Text || "");
                            setAreas([]);
                            setBranches([]);
                            void fetchAreas(cityId);
                            void fetchBranches(cityId);
                          }}
                          required
                        >
                          <option value="">Choose City</option>
                          {cities.map((city) => (
                            <option
                              key={String(city.Value)}
                              value={String(city.Value)}
                            >
                              {city.Text}
                            </option>
                          ))}
                        </select>
                        <Icon.CaretDown
                          size={14}
                          className="checkout-select-icon"
                        />
                      </div>
                    </div>

                    <div className="checkout-field">
                      <label className="checkout-label" htmlFor="areaId">
                        Area <span className="text-red-500">*</span>
                      </label>
                      <div className="checkout-select-wrap">
                        <select
                          id="areaId"
                          className="checkout-select"
                          value={form.areaId}
                          onChange={(e) => updateForm("areaId", e.target.value)}
                          required
                        >
                          <option value="">Choose Area</option>
                          {areas.map((area) => (
                            <option key={area.Value} value={area.Value}>
                              {area.Text}
                            </option>
                          ))}
                        </select>
                        <Icon.CaretDown
                          size={14}
                          className="checkout-select-icon"
                        />
                      </div>
                    </div>
                    <div className="checkout-field">
                      <label className="checkout-label" htmlFor="branchId">
                        Branch <span className="text-red-500">*</span>
                      </label>
                      <div className="checkout-select-wrap">
                        <select
                          id="branchId"
                          className="checkout-select"
                          value={form.branchId}
                          onChange={(e) =>
                            updateForm("branchId", e.target.value)
                          }
                          required
                        >
                          <option value="">Select Branch</option>
                          {branches.map((branch) => (
                            <option key={branch.Value} value={branch.Value}>
                              {branch.Text}
                            </option>
                          ))}
                        </select>
                        <Icon.CaretDown
                          size={14}
                          className="checkout-select-icon"
                        />
                      </div>
                    </div>
                    <div className="checkout-field">
                      <label className="checkout-label" htmlFor="address">
                        Street Address *
                      </label>
                      <input
                        id="address"
                        className="checkout-input"
                        type="text"
                        placeholder="House no, street, landmark"
                        value={form.address}
                        onChange={(e) => updateForm("address", e.target.value)}
                        required
                      />
                    </div>

                    <div className="checkout-field">
                      <label className="checkout-label" htmlFor="postalCode">
                        Postal Code *
                      </label>
                      <input
                        type="text"
                        id="postalCode"
                        className="checkout-input"
                        value={form.postalCode}
                        onChange={(e) =>
                          updateForm("postalCode", e.target.value)
                        }
                        placeholder="Postal Code"
                        required
                      />
                    </div>

                    <div className="checkout-save-address-row full-width">
                      <label className="checkout-checkbox-row">
                       
                        <span>
                          Save this address for future orders
                          <small className="checkout-checkbox-hint">
                            {form.addressBookId > 0
                              ? "A saved address is applied. Tick this to store the edited details as a new one."
                              : "Save it right now, or leave it ticked to save when the order is placed."}
                          </small>
                        </span>
                      </label>
                      <button
                        type="button"
                        className="checkout-save-address-btn"
                        onClick={() => void handleSaveAddressNow()}
                        disabled={savingAddress}
                      >
                        {savingAddress ? (
                          "Saving..."
                        ) : (
                          <>
                            <Icon.BookmarkSimple size={15} weight="bold" />
                            Save Address
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="checkout-section">
                  <h2 className="checkout-section-title">
                    <span className="checkout-section-icon">
                      <Icon.CreditCard size={18} weight="bold" />
                    </span>
                    Billing Details
                  </h2>
                  <div className="checkout-field-grid cols-2">
                    <label className="checkout-checkbox-row full-width">
                      <input
                        type="checkbox"
                        checked={form.billingSameAsShipping}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          if (checked) {
                            updateForm("billingSameAsShipping", true);
                            return;
                          }
                          setForm((prev) => ({
                            ...prev,
                            billingSameAsShipping: false,
                            billingFullName: "",
                            billingEmail: "",
                            billingPhone: "",
                            billingPhoneCode: "",
                            billingIsoCode: "",
                          }));
                        }}
                      />
                      <span>Billing details same as shipping</span>
                    </label>

                    {!form.billingSameAsShipping && (
                      <>
                        <div className="checkout-field full-width">
                          <label
                            className="checkout-label"
                            htmlFor="billingFullName"
                          >
                            Billing Full Name *
                          </label>
                          <input
                            id="billingFullName"
                            className="checkout-input"
                            type="text"
                            placeholder="John Doe"
                            value={form.billingFullName}
                            onChange={(e) =>
                              updateForm("billingFullName", e.target.value)
                            }
                            required
                          />
                        </div>
                        <div className="checkout-field">
                          <label
                            className="checkout-label"
                            htmlFor="billingEmail"
                          >
                            Billing Email *
                          </label>
                          <input
                            id="billingEmail"
                            className="checkout-input"
                            type="email"
                            placeholder="billing@example.com"
                            value={form.billingEmail}
                            onChange={(e) =>
                              updateForm("billingEmail", e.target.value)
                            }
                            required
                          />
                        </div>
                        <div className="checkout-field checkout-phone-field">
                          <label
                            className="checkout-label"
                            htmlFor="billingPhone"
                          >
                            Billing Phone *
                          </label>
                          <PhoneInput
                            country={String(
                              form.billingIsoCode || form.isoCode || "PK",
                            ).toLowerCase()}
                            value={`+${form.billingPhoneCode || form.phoneCode || "92"}${form.billingPhone || ""}`}
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

                              const dial = data.dialCode;
                              let localNum = value;

                              if (localNum.startsWith(dial)) {
                                localNum = localNum.slice(dial.length);
                              } else if (localNum.startsWith("+" + dial)) {
                                localNum = localNum.slice(dial.length + 1);
                              }

                              localNum = localNum.replace(/\D/g, "");

                              if (localNum.startsWith("0")) {
                                localNum = localNum.replace(/^0+/, "");
                              }

                              setForm((prev) => ({
                                ...prev,
                                billingPhoneCode: normalizeDialCode(dial),
                                billingIsoCode: data.countryCode.toUpperCase(),
                                billingPhone: localNum,
                              }));
                            }}
                            inputProps={{
                              id: "billingPhone",
                              name: "billingPhone",
                              required: true,
                            }}
                            containerClass="w-full"
                            enableSearch
                            disableSearchIcon
                            searchPlaceholder="Search country"
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <div className="checkout-section">
                  <h2 className="checkout-section-title">
                    <span className="checkout-section-icon">
                      <Icon.Truck size={18} weight="bold" />
                    </span>
                    Delivery Details
                  </h2>
                  <div className="checkout-field-grid cols-2">
                    <div className="checkout-field">
                      <label className="checkout-label" htmlFor="deliveryDate">
                        Preferred Delivery Date{" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="deliveryDate"
                        className="checkout-input"
                        type="datetime-local"
                        value={form.deliveryDate}
                        onChange={(e) =>
                          updateForm("deliveryDate", e.target.value)
                        }
                        required
                      />
                    </div>

                    <div className="checkout-field">
                      <label
                        className="checkout-label"
                        htmlFor="deliveryOption"
                      >
                        Delivery Option <span className="text-red-500">*</span>
                      </label>
                      <div className="checkout-select-wrap">
                        <select
                          id="deliveryOption"
                          className="checkout-select"
                          value={form.deliveryOption}
                          onChange={(e) =>
                            updateForm(
                              "deliveryOption",
                              e.target.value ? Number(e.target.value) : "",
                            )
                          }
                          required
                        >
                          <option value="" disabled>
                            Please select your delivery option
                          </option>
                          <option value={1}>Home Delivery</option>
                          <option value={2}>Store Pickup</option>
                        </select>
                        <Icon.CaretDown
                          size={14}
                          className="checkout-select-icon"
                        />
                      </div>
                    </div>

                    <div className="checkout-field full-width">
                      <label
                        className="checkout-label"
                        htmlFor="specialInstructions"
                      >
                        Special Instructions
                      </label>
                      <textarea
                        id="specialInstructions"
                        className="checkout-textarea"
                        placeholder="Any special instructions for your order..."
                        rows={3}
                        value={form.specialInstructions}
                        onChange={(e) =>
                          updateForm("specialInstructions", e.target.value)
                        }
                      />
                    </div>

                    <div className="checkout-field full-width">
                      <label
                        className="checkout-label"
                        htmlFor="deliveryInstructions"
                      >
                        Delivery Instructions
                      </label>
                      <textarea
                        id="deliveryInstructions"
                        className="checkout-textarea"
                        placeholder="Gate code, call before delivery, etc."
                        rows={2}
                        value={form.deliveryInstructions}
                        onChange={(e) =>
                          updateForm("deliveryInstructions", e.target.value)
                        }
                      />
                    </div>

                    <label className="checkout-checkbox-row full-width">
                      <input
                        type="checkbox"
                        checked={form.isGiftOrder}
                        onChange={(e) =>
                          updateForm("isGiftOrder", e.target.checked)
                        }
                      />
                      <span>This is a gift order</span>
                    </label>
                  </div>
                </div>

                <div className="checkout-submit">
                  <button
                    title="Create Your Order"
                    type="submit"
                    className="button-main bg-black"
                    disabled={submitting || cartState.cartArray.length === 0}
                  >
                    {submitting ? "Creating pay now..." : "Pay Now"}
                  </button>
                </div>
              </form>
            </div>

            <aside className="checkout-summary-card">
              <div className="checkout-summary-title">
                <span className="heading5">Your Order</span>
                {cartState.cartArray.length > 0 && (
                  <span className="checkout-summary-count">
                    {cartState.cartArray.length}
                  </span>
                )}
              </div>

              <div className="checkout-items">
                {cartState.cartArray.length === 0 ? (
                  <div className="checkout-empty">
                    <p className="text-secondary text-button">
                      No products in cart.
                    </p>
                    <Link
                      href="/"
                      className="text-button underline mt-2 inline-block"
                    >
                      Continue shopping
                    </Link>
                  </div>
                ) : (
                  cartState.cartArray.map((product, index) => {
                    const image =
                      product.thumbImage?.[0] ||
                      product.images?.[0] ||
                      "/images/product/1000x1000.png";
                    const variantsLabel = getVariantsLabel(product);
                    // Subtotal is pre-discount, so rows must show pre-discount too.
                    const unitGross = product.originPrice || product.price || 0;
                    const grossLineTotal = unitGross * (product.quantity || 1);
                    const lineDiscount = Math.max(
                      0,
                      grossLineTotal - (product.lineTotal || 0),
                    );

                    return (
                      <div
                        key={product.cartId || `${product.id}-${index}`}
                        className="checkout-item"
                      >
                        <div className="checkout-item-image">
                          <Image
                            src={image}
                            fill
                            sizes="72px"
                            alt={product.name}
                            className="object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          {product.category && (
                            <div className="caption2 text-secondary uppercase">
                              {product.category}
                            </div>
                          )}
                          <div className="text-button font-semibold line-clamp-2 mt-0.5">
                            {product.name}
                          </div>
                          {variantsLabel && (
                            <span className="checkout-item-variant">
                              {variantsLabel}
                            </span>
                          )}
                          <div className="checkout-item-foot">
                            <span className="caption1 text-secondary">
                              {product.quantity} × {formatRsPrice(unitGross)}
                            </span>
                            <span className="text-button font-semibold">
                              {formatRsPrice(grossLineTotal)}
                            </span>
                          </div>
                          {lineDiscount > 0 && (
                            <>
                              <div className="summary-item-line is-discount">
                                <span>Item discount</span>
                                <span>-{formatRsPrice(lineDiscount)}</span>
                              </div>
                              <div className="summary-item-line is-payable">
                                <span>You pay</span>
                                <span>
                                  {formatRsPrice(product.lineTotal || 0)}
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="checkout-totals">
                <div className="checkout-total-row">
                  <span>
                    Items total
                    <small className="summary-hint">
                      {cartState.cartArray.length} item(s), before discount
                    </small>
                  </span>
                  <span>{formatRsPrice(subTotal)}</span>
                </div>

                {campaignDiscounts.length > 0 ? (
                  campaignDiscounts.map((campaign) => (
                    <div
                      key={`${campaign.campaignType}-${campaign.campaignTypeDisplayName}`}
                      className="checkout-total-row is-discount"
                    >
                      <span>
                        {getCampaignDiscountLabel(
                          campaign.campaignType,
                          campaign.campaignTypeDisplayName,
                        )}
                      </span>
                      <span>-{formatRsPrice(campaign.amount)}</span>
                    </div>
                  ))
                ) : (
                  <div className="checkout-total-row">
                    <span>Discount</span>
                    <span>{formatRsPrice(0)}</span>
                  </div>
                )}

                {campaignDiscounts.length > 1 && discount > 0 && (
                  <div className="checkout-total-row is-discount">
                    <span>Total discount</span>
                    <span>-{formatRsPrice(discount)}</span>
                  </div>
                )}

                {pendingPromo &&
                  !campaignDiscounts.some(
                    (campaign) =>
                      campaign.campaignType === CampaignType.PromoCode,
                  ) && (
                    <div className="checkout-total-row">
                      <span>
                        Promo code ({pendingPromo})
                        <small className="summary-hint">
                          Discount applies after your order is created
                        </small>
                      </span>
                      <span className="text-secondary">Pending</span>
                    </div>
                  )}

                <div className="checkout-total-row is-step">
                  <span>Amount after discount</span>
                  <span>{formatRsPrice(netTotal)}</span>
                </div>

                <div className="checkout-total-row">
                  <span>
                    Delivery charges
                    {qualifiesForFreeShipping && minimumOrderValue > 0 && (
                      <small className="summary-hint">
                        Free on orders above{" "}
                        {formatRsPrice(minimumOrderValue)}
                      </small>
                    )}
                    {!qualifiesForFreeShipping &&
                      minimumOrderValue > 0 &&
                      ship > 0 && (
                        <small className="summary-hint">
                          Add{" "}
                          {formatRsPrice(
                            Math.max(0, minimumOrderValue - netTotal),
                          )}{" "}
                          more for free delivery
                        </small>
                      )}
                  </span>
                  <span>{ship > 0 ? `+ ${formatRsPrice(ship)}` : "Free"}</span>
                </div>

                <div className="checkout-total-row is-grand">
                  <span>Total payable</span>
                  <span>{formatRsPrice(orderTotal)}</span>
                </div>

                {discount > 0 && (
                  <div className="summary-savings">
                    You save {formatRsPrice(discount)} on this order
                  </div>
                )}
              </div>

              <p className="checkout-summary-note">
                Items total − discount + delivery = total payable · All prices
                in PKR (Rs.)
              </p>

              <Link href="/cart" className="checkout-back-cart">
                ← Back to cart
              </Link>
            </aside>
          </div>
        </div>
      </div>

      <Footer />

      <ModalSavedAddresses
        open={addressModalOpen && savedAddresses.length > 0}
        addresses={savedAddresses}
        selectedAddressId={selectedAddressId}
        loading={loadingAddresses}
        onClose={() => setAddressModalOpen(false)}
        onSelect={(address) => {
          void applySavedAddress(address);
        }}
        onDeleted={(addressBookId) => {
          setSavedAddresses((current) =>
            current.filter(
              (address) => address.AddressBookId !== addressBookId,
            ),
          );

          if (selectedAddressId === addressBookId) {
            startNewAddress();
          }
        }}
        onUseNew={startNewAddress}
      />

      {addressSavedPopup !== null && (
        <div
          className="checkout-address-modal-overlay"
          onClick={() => setAddressSavedPopup(null)}
          role="presentation"
        >
          <div
            className="checkout-address-modal is-compact"
            role="dialog"
            aria-modal="true"
            aria-labelledby="checkout-address-saved-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="checkout-address-saved">
              <span className="checkout-address-saved-icon">
                <Icon.CheckCircle size={30} weight="fill" />
              </span>
              <h3
                id="checkout-address-saved-title"
                className="heading5 text-center"
              >
                Address saved
              </h3>
              <p className="caption1 text-secondary text-center mt-2">
                This address is now in your address book, so you can pick it
                from &quot;Choose Address&quot; on your next order.
              </p>
              {addressSavedPopup && (
                <p className="checkout-address-saved-line">
                  {addressSavedPopup}
                </p>
              )}
              <button
                type="button"
                className="button-main checkout-address-modal-new"
                onClick={() => setAddressSavedPopup(null)}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Checkout;
