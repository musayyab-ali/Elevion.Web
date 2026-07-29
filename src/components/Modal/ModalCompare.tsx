"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import * as Icon from "@phosphor-icons/react/dist/ssr";
import toast from "react-hot-toast";
import { useModalCompareContext } from "@/context/ModalCompareContext";
import { useCompare } from "@/context/CompareContext";
import { formatRsPrice } from "@/lib/cart";
import { getProductDetailUrl } from "@/lib/featured-products";

const MAX_COMPARE_ITEMS = 3;

const ModalCompare = () => {
  const { isModalOpen, closeModalCompare } = useModalCompareContext();
  const { compareState, removeFromCompare, clearCompare } = useCompare();

  const compareItems = compareState.compareArray.slice(0, MAX_COMPARE_ITEMS);
  const compareCount = compareState.compareArray.length;
  const canCompare = compareCount >= 2;
  const emptySlots = Math.max(0, MAX_COMPARE_ITEMS - compareItems.length);

  const handleClearAll = () => {
    clearCompare();
    closeModalCompare();
  };

  const handleCompareClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!canCompare) {
      toast.error("Add at least 2 products to compare.");
    }
  };

  const getProductUrl = (product: (typeof compareItems)[0]) => {
    const productId = Number(product.id);
    const detailId = product.productDetailId
      ? Number(product.productDetailId)
      : undefined;

    if (!Number.isNaN(productId)) {
      return getProductDetailUrl(productId, detailId);
    }

    return "/";
  };

  return (
    <div className="modal-compare-block" onClick={closeModalCompare}>
      <div
        className={`modal-compare-main ${isModalOpen ? "open" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-compare-header">
          <div className="modal-compare-header-title">
            <span className="modal-compare-header-icon">
              <Icon.Scales size={20} weight="bold" />
            </span>
            <div>
              <div className="heading6 leading-tight">Compare Products</div>
              <p className="caption2 text-secondary mt-0.5">
                Add up to {MAX_COMPARE_ITEMS} items to compare
              </p>
            </div>
            {compareCount > 0 && (
              <span className="modal-compare-count-badge">{compareCount}</span>
            )}
          </div>
          <button
            type="button"
            className="modal-compare-close-btn"
            onClick={closeModalCompare}
            aria-label="Close compare"
          >
            <Icon.X size={18} />
          </button>
        </div>

        <div className="modal-compare-body">
          {compareCount === 0 ? (
            <div className="modal-compare-empty">
              <div className="modal-compare-empty-icon">
                <Icon.Scales size={24} weight="duotone" />
              </div>
              <p className="text-button font-semibold">No products to compare yet</p>
              <p className="caption1 text-secondary mt-1">
                Use the compare icon on products to add them here.
              </p>
            </div>
          ) : (
            <div className="modal-compare-list">
              {compareItems.map((product) => {
                const image =
                  product.thumbImage?.[0] ||
                  product.images?.[0] ||
                  "/images/product/1000x1000.png";
                const hasSale =
                  product.sale &&
                  product.originPrice > 0 &&
                  product.originPrice > product.price;

                return (
                  <div key={product.id} className="modal-compare-item">
                    <button
                      type="button"
                      className="modal-compare-item-remove"
                      onClick={() => removeFromCompare(product.id)}
                      aria-label={`Remove ${product.name}`}
                    >
                      <Icon.X size={14} weight="bold" />
                    </button>

                    <div className="modal-compare-item-inner">
                      <Link
                        href={getProductUrl(product)}
                        onClick={closeModalCompare}
                        className="modal-compare-item-image"
                      >
                        <Image
                          src={image}
                          fill
                          sizes="72px"
                          alt={product.name}
                          className="object-cover"
                        />
                      </Link>

                      <div className="modal-compare-item-content">
                        {product.category && (
                          <div className="modal-compare-item-category">
                            {product.category}
                          </div>
                        )}
                        <Link
                          href={getProductUrl(product)}
                          onClick={closeModalCompare}
                          className="modal-compare-item-name"
                        >
                          {product.name}
                        </Link>
                        <div className="modal-compare-item-price">
                          {formatRsPrice(product.price)}
                          {hasSale && (
                            <span className="modal-compare-item-price-old">
                              {formatRsPrice(product.originPrice)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {emptySlots > 0 &&
                Array.from({ length: emptySlots }).map((_, index) => (
                  <div key={`slot-${index}`} className="modal-compare-slot">
                    <span className="modal-compare-slot-icon">
                      <Icon.Plus size={18} weight="bold" />
                    </span>
                    <span className="caption2">Add another product</span>
                  </div>
                ))}
            </div>
          )}
        </div>

        <div className="modal-compare-footer">
          <p className="modal-compare-footer-note">
            {canCompare
              ? "Ready to compare side by side on the full page."
              : "Add at least 2 products to start comparing."}
          </p>

          <div className="modal-compare-footer-actions">
            {canCompare ? (
              <Link
                href="/compare"
                onClick={closeModalCompare}
                className="modal-compare-action-btn is-primary"
              >
                <Icon.ArrowsLeftRight size={16} weight="bold" />
                Compare Products
              </Link>
            ) : (
              <button
                type="button"
                className="modal-compare-action-btn is-primary"
                onClick={handleCompareClick}
                disabled={compareCount === 0}
              >
                <Icon.ArrowsLeftRight size={16} weight="bold" />
                Compare Products
              </button>
            )}

            <button
              type="button"
              className="modal-compare-action-btn is-secondary"
              onClick={handleClearAll}
              disabled={compareCount === 0}
            >
              Clear All
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalCompare;
