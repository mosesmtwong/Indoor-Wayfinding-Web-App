/**
 * API client for the desk booking backend.
 * All requests go through the Vite proxy → localhost:3001
 */

const API_BASE = "/api";

// ---- Types ----

export interface Desk {
  id: number;
  name: string;
  floor: number;
  location: string; // JSON string like '{"x":295,"y":300}'
  status: "available" | "booked";
}

export interface Booking {
  id: number;
  desk_id: number;
  user_id: string;
  start_time: string;
  end_time: string;
  status: "active" | "cancelled";
  desk_name?: string;
  floor?: number;
}

export interface TimeSlot {
  start: string;
  end: string;
  available: boolean;
}

// ---- API calls ----

// Get all desks with computed availability
export async function fetchDesks(): Promise<Desk[]> {
  const res = await fetch(`${API_BASE}/desks`);
  if (!res.ok) throw new Error("Failed to fetch desks");
  const data = await res.json();
  return data.desks;
}

// Get available time slots for a desk on a given date
export async function fetchDeskAvailability(
  deskId: number,
  date: string
): Promise<TimeSlot[]> {
  const res = await fetch(`${API_BASE}/desks/${deskId}/availability?date=${date}`);
  if (!res.ok) throw new Error("Failed to fetch availability");
  const data = await res.json();
  return data.slots;
}

// Create a new booking
export async function createBooking(
  deskId: number,
  userId: string,
  startTime: string,
  endTime: string
): Promise<{ booking: Booking; message: string }> {
  const res = await fetch(`${API_BASE}/bookings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      desk_id: deskId,
      user_id: userId,
      start_time: startTime,
      end_time: endTime,
    }),
  });

  const data = await res.json();

  // 409 = conflict, 400 = validation error
  if (!res.ok) {
    throw new Error(data.error || "Failed to create booking");
  }

  return data;
}

// Cancel a booking
export async function cancelBooking(bookingId: number): Promise<void> {
  const res = await fetch(`${API_BASE}/bookings/${bookingId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Failed to cancel booking");
  }
}

// Get bookings for a specific user
export async function fetchMyBookings(userId: string): Promise<Booking[]> {
  const res = await fetch(`${API_BASE}/bookings/me?user_id=${userId}`);
  if (!res.ok) throw new Error("Failed to fetch bookings");
  const data = await res.json();
  return data.bookings;
}
