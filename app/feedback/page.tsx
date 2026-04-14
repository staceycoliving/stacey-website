"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

// Single Google Maps listing for all STACEY locations
const GOOGLE_REVIEW_URL = "https://www.google.com/maps?cid=16719498132090014953&action=review";

export default function FeedbackPageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background-alt" />}>
      <FeedbackPage />
    </Suspense>
  );
}

function FeedbackPage() {
  const params = useSearchParams();
  const location = params.get("location") || "";
  const locationName = params.get("name") || "STACEY";
  const firstName = params.get("firstName") || "";
  const stayType = params.get("type") || "SHORT";

  const [rating, setRating] = useState<number | null>(null);
  const [hoveredStar, setHoveredStar] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleStarClick = (star: number) => {
    setRating(star);

    // 4-5 stars → redirect to Google Review
    if (star >= 4) {
      window.location.href = GOOGLE_REVIEW_URL;
    }
  };

  const handleSubmitFeedback = async () => {
    if (!feedback.trim()) return;
    setSubmitting(true);

    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location,
          locationName,
          firstName,
          stayType,
          rating,
          feedback,
        }),
      });
      setSubmitted(true);
    } catch {
      setSubmitted(true);
    }
  };

  // Thank you state after submitting feedback
  if (submitted) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-[5px] p-10 text-center shadow-sm">
          <div className="text-4xl mb-4">🙏</div>
          <h1 className="text-2xl font-bold text-[#1A1A1A] mb-3">
            Thanks for your feedback
          </h1>
          <p className="text-[#555] text-base leading-relaxed">
            We appreciate you taking the time to share your thoughts.
            Your feedback helps us improve the STACEY experience for everyone.
          </p>
        </div>
      </div>
    );
  }

  // Low rating → show feedback form
  if (rating !== null && rating <= 3) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-[5px] p-10 shadow-sm">
          <h1 className="text-2xl font-bold text-[#1A1A1A] mb-2">
            We're sorry to hear that
          </h1>
          <p className="text-[#555] text-base leading-relaxed mb-6">
            {firstName ? `Thanks ${firstName}, y` : "Y"}our feedback is really important to us.
            Please let us know what we can do better:
          </p>

          {/* Star display */}
          <div className="flex gap-1 mb-6 justify-center">
            {[1, 2, 3, 4, 5].map((star) => (
              <span
                key={star}
                className="text-3xl"
                style={{ color: star <= rating ? "#FCB0C0" : "#ddd" }}
              >
                ★
              </span>
            ))}
          </div>

          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="What could we improve? Any specific issues during your stay?"
            rows={5}
            className="w-full border border-gray-200 rounded-[5px] p-4 text-sm text-[#1A1A1A] placeholder:text-gray-400 focus:outline-none focus:border-[#FCB0C0] resize-none mb-4"
          />

          <button
            onClick={handleSubmitFeedback}
            disabled={!feedback.trim() || submitting}
            className="w-full bg-[#1A1A1A] text-white py-3.5 rounded-[5px] font-semibold text-base disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? "Sending..." : "Send feedback"}
          </button>
        </div>
      </div>
    );
  }

  // Initial state → show star rating
  return (
    <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-[5px] p-10 text-center shadow-sm">
        <h1 className="text-2xl font-bold text-[#1A1A1A] mb-2">
          How was your {stayType === "LONG" ? "time" : "stay"} at {locationName}?
        </h1>
        <p className="text-[#555] text-base leading-relaxed mb-8">
          {firstName ? `Hi ${firstName}, t` : "T"}ap a star to rate your experience.
        </p>

        <div className="flex gap-2 justify-center mb-6">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => handleStarClick(star)}
              onMouseEnter={() => setHoveredStar(star)}
              onMouseLeave={() => setHoveredStar(null)}
              className="text-5xl transition-transform hover:scale-110 cursor-pointer bg-transparent border-none p-1"
              style={{
                color:
                  star <= (hoveredStar ?? rating ?? 0)
                    ? "#FCB0C0"
                    : "#ddd",
              }}
            >
              ★
            </button>
          ))}
        </div>

        <p className="text-xs text-gray-400">
          Your feedback helps us improve.
        </p>
      </div>
    </div>
  );
}
