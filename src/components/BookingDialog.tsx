import { useContext, useEffect, useState } from "react";
import type { Desk, TimeSlot } from "@/utils/bookingApi";
import {
  fetchDeskAvailability,
  createBooking,
} from "@/utils/bookingApi";
import { toast } from "react-toastify";
import { BookingContext } from "@/pages/Map";
import { FiX, FiClock, FiCalendar } from "react-icons/fi";

interface BookingDialogProps {
  open: boolean;
  desk: Desk | null;
  onClose: () => void;
}

const MOCK_USER = "user-1";

function BookingDialog({ open, desk, onClose }: BookingDialogProps) {
  const [date, setDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split("T")[0];
  });
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const bookingCtx = useContext(BookingContext);

  // Fetch availability when desk or date changes
  useEffect(() => {
    if (!desk || !open) return;
    setLoading(true);
    setSelectedSlot(null);
    fetchDeskAvailability(desk.id, date)
      .then((s) => setSlots(s))
      .catch(() => toast.error("Failed to load availability"))
      .finally(() => setLoading(false));
  }, [desk, date, open]);

  async function handleBook() {
    if (!desk || !selectedSlot) return;
    setSubmitting(true);
    try {
      await createBooking(desk.id, MOCK_USER, selectedSlot.start, selectedSlot.end);
      toast.success(`Booked ${desk.name}!`);
      bookingCtx?.refresh();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Booking failed");
    } finally {
      setSubmitting(false);
    }
  }

  function formatTime(iso: string) {
    return iso.split("T")[1]?.substring(0, 5) || iso;
  }

  if (!desk || !open) return null;

  const isAvailable = desk.status === "available";

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
        <div
          className="bg-white rounded-2xl shadow-2xl w-[420px] max-w-[92vw] max-h-[85vh] overflow-hidden pointer-events-auto animate-fadeIn scale-95 opacity-0"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm ${
                  isAvailable ? "bg-green-500" : "bg-red-500"
                }`}
              >
                {desk.name.replace("Desk-", "")}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {desk.name}
                </h2>
                <p className="text-xs text-gray-400">
                  Floor {desk.floor} •{" "}
                  <span className={isAvailable ? "text-green-600" : "text-red-500"}>
                    {isAvailable ? "Available" : "Currently Booked"}
                  </span>
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <FiX size={18} />
            </button>
          </div>

          <hr className="border-gray-100" />

          {/* Body */}
          <div className="px-5 py-4 overflow-y-auto max-h-[60vh]">
            {/* Date picker */}
            <div className="mb-5">
              <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-2">
                <FiCalendar className="text-blue-500" />
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent focus:outline-none bg-gray-50 hover:bg-white transition-colors"
              />
            </div>

            {/* Time slots */}
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-2">
                <FiClock className="text-blue-500" />
                Time Slots (30 min each)
              </label>
              {loading ? (
                <div className="text-center text-gray-400 py-8 text-sm">
                  Loading slots...
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {slots.map((slot) => {
                    const isSelected = selectedSlot?.start === slot.start;
                    return (
                      <button
                        key={slot.start}
                        disabled={!slot.available}
                        onClick={() => setSelectedSlot(slot)}
                        className={`px-2 py-2.5 rounded-lg text-xs font-semibold transition-all
                          ${
                            !slot.available
                              ? "bg-gray-100 text-gray-300 cursor-not-allowed"
                              : isSelected
                              ? "bg-blue-500 text-white shadow-md shadow-blue-200 scale-105"
                              : "bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 hover:border-green-300"
                          }
                        `}
                      >
                        {formatTime(slot.start)}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mt-4 text-xs text-gray-400">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-green-50 border border-green-200" />
                Available
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-gray-100" />
                Booked
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-blue-500" />
                Selected
              </span>
            </div>

            {/* Selection summary */}
            {selectedSlot && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-800 flex items-center gap-2">
                <FiClock className="text-blue-500 flex-shrink-0" />
                <span>
                  <strong>{formatTime(selectedSlot.start)}</strong> –{" "}
                  <strong>{formatTime(selectedSlot.end)}</strong> on{" "}
                  <strong>{date}</strong>
                </span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-100 bg-gray-50/50">
            <button
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleBook}
              disabled={!selectedSlot || submitting}
              className="px-5 py-2.5 text-sm font-medium bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md"
            >
              {submitting ? "Booking..." : "Book Desk"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default BookingDialog;
