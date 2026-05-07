import { useContext, useState } from "react";
import { BookingContext } from "@/pages/Map";
import type { Desk } from "@/utils/bookingApi";
import { cancelBooking } from "@/utils/bookingApi";
import { toast } from "react-toastify";
import { FiClock, FiTrash2, FiCalendar, FiMapPin } from "react-icons/fi";

interface BookingPanelProps {
  onDeskClick: (desk: Desk) => void;
}

function BookingPanel({ onDeskClick }: BookingPanelProps) {
  const bookingCtx = useContext(BookingContext);
  const [tab, setTab] = useState<"desks" | "mybookings">("desks");
  const [cancelling, setCancelling] = useState<number | null>(null);

  if (!bookingCtx) return null;

  const { desks, myBookings, refresh } = bookingCtx;

  const floor1Desks = desks.filter((d) => d.floor === 1);
  const floor2Desks = desks.filter((d) => d.floor === 2);
  const activeBookings = myBookings.filter((b) => b.status === "active");

  async function handleCancel(bookingId: number) {
    setCancelling(bookingId);
    try {
      await cancelBooking(bookingId);
      toast.success("Booking cancelled");
      refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to cancel");
    } finally {
      setCancelling(null);
    }
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString([], {
      month: "short",
      day: "numeric",
    });
  }

  function renderFloorGroup(label: string, floorDesks: Desk[]) {
    return (
      <div className="mb-5">
        <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest px-1 mb-2">
          {label}
        </h3>
        <div className="space-y-1">
          {floorDesks.map((desk) => (
            <button
              key={desk.id}
              onClick={() => onDeskClick(desk)}
              className="flex items-center w-full px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-left group"
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold mr-3 flex-shrink-0 ${
                  desk.status === "available"
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-600"
                }`}
              >
                {desk.name.replace("Desk-", "")}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">
                  {desk.name}
                </p>
              </div>
              <span
                className={`text-[11px] px-2.5 py-1 rounded-full font-semibold flex-shrink-0 ${
                  desk.status === "available"
                    ? "bg-green-50 text-green-600 border border-green-200"
                    : "bg-red-50 text-red-500 border border-red-200"
                }`}
              >
                {desk.status === "available" ? "Open" : "Booked"}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Sub-tabs */}
      <div className="flex bg-gray-100 rounded-lg p-0.5 mb-4">
        <button
          onClick={() => setTab("desks")}
          className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1.5 ${
            tab === "desks"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <FiMapPin size={13} />
          All Desks
        </button>
        <button
          onClick={() => setTab("mybookings")}
          className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1.5 ${
            tab === "mybookings"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <FiCalendar size={13} />
          My Bookings
          {activeBookings.length > 0 && (
            <span className="bg-blue-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
              {activeBookings.length}
            </span>
          )}
        </button>
      </div>

      {/* Desk list */}
      {tab === "desks" && (
        <div className="overflow-auto flex-1 pr-1">
          {renderFloorGroup("Floor 1", floor1Desks)}
          {renderFloorGroup("Floor 2", floor2Desks)}
        </div>
      )}

      {/* My bookings */}
      {tab === "mybookings" && (
        <div className="overflow-auto flex-1 pr-1">
          {activeBookings.length === 0 ? (
            <div className="text-center text-gray-400 py-12">
              <FiCalendar className="mx-auto text-3xl mb-3 text-gray-300" />
              <p className="text-sm font-medium">No active bookings</p>
              <p className="text-xs mt-1">Book a desk to get started</p>
            </div>
          ) : (
            <div className="space-y-2">
              {activeBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-center px-3 py-3 rounded-xl bg-blue-50/60 border border-blue-100"
                >
                  <div
                    className="w-8 h-8 rounded-lg bg-blue-500 text-white flex items-center justify-center text-xs font-bold mr-3 flex-shrink-0"
                  >
                    {booking.desk_name?.replace("Desk-", "") || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">
                      {booking.desk_name}
                      <span className="text-gray-400 ml-1 font-normal text-[11px]">
                        F{booking.floor}
                      </span>
                    </p>
                    <p className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-1">
                      <FiClock size={11} className="text-blue-400" />
                      {formatDate(booking.start_time)},{" "}
                      {formatTime(booking.start_time)} –{" "}
                      {formatTime(booking.end_time)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleCancel(booking.id)}
                    disabled={cancelling === booking.id}
                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                    title="Cancel booking"
                  >
                    {cancelling === booking.id ? (
                      <span className="text-[10px] text-gray-400">...</span>
                    ) : (
                      <FiTrash2 size={14} />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default BookingPanel;
