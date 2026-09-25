const { db } = require('../config/firebaseConfig');

// Helper to check DB initialization
const checkDb = (res) => {
  if (!db) {
    res.status(503).json({
      success: false,
      message: 'Database connection is not initialized. Please configure Firebase credentials.'
    });
    return false;
  }
  return true;
};

/**
 * Book tickets atomically using Firestore runTransaction
 * Rate limited to 10 requests / minute per client
 */
exports.bookTicket = async (req, res, next) => {
  if (!checkDb(res)) return;

  const { eventId, quantity, attendeeName, attendeeEmail } = req.body;
  const userId = req.user.id;

  if (!eventId || !quantity || !attendeeName || !attendeeEmail) {
    return res.status(400).json({
      success: false,
      message: 'All fields (eventId, quantity, attendeeName, attendeeEmail) are required.'
    });
  }

  const qty = parseInt(quantity, 10);
  if (isNaN(qty) || qty <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Quantity must be a positive integer greater than 0.'
    });
  }

  const eventRef = db.collection('events').doc(eventId);
  const ticketRef = db.collection('tickets').doc();

  try {
    const result = await db.runTransaction(async (t) => {
      const eventDoc = await t.get(eventRef);
      if (!eventDoc.exists) {
        throw new Error('Event not found');
      }

      const eventData = eventDoc.data();
      if (eventData.availableTickets < qty) {
        throw new Error('Insufficient tickets available');
      }

      // Decrement availableTickets atomically
      t.update(eventRef, { availableTickets: eventData.availableTickets - qty });

      const bookingRef = `TKT-${Date.now().toString().slice(-6)}`;
      const newTicket = {
        id: ticketRef.id,
        eventId,
        eventTitle: eventData.title,
        userId,
        attendeeName: attendeeName.trim(),
        attendeeEmail: attendeeEmail.trim().toLowerCase(),
        quantity: qty,
        totalPaid: qty * eventData.ticketPrice,
        bookingRef,
        status: 'confirmed',
        bookedAt: new Date().toISOString()
      };

      t.set(ticketRef, newTicket);
      return newTicket;
    });

    res.status(201).json({
      success: true,
      message: 'Tickets booked successfully',
      data: result
    });
  } catch (error) {
    const statusCode = error.message.includes('Forbidden') ? 403 : error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get all tickets booked by the authenticated attendee
 */
exports.getMyTickets = async (req, res, next) => {
  try {
    if (!checkDb(res)) return;

    const userId = req.user.id;
    const ticketsSnapshot = await db.collection('tickets')
      .where('userId', '==', userId)
      .get();

    const tickets = [];
    ticketsSnapshot.forEach((doc) => {
      tickets.push({ id: doc.id, ...doc.data() });
    });

    // Sort in memory by bookedAt descending
    tickets.sort((a, b) => new Date(b.bookedAt) - new Date(a.bookedAt));

    return res.status(200).json({
      success: true,
      count: tickets.length,
      data: tickets
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Cancel ticket atomically and restore available tickets
 */
exports.cancelTicket = async (req, res, next) => {
  if (!checkDb(res)) return;

  const ticketId = req.params.id;
  const userId = req.user.id;
  const ticketRef = db.collection('tickets').doc(ticketId);

  try {
    const result = await db.runTransaction(async (t) => {
      const ticketDoc = await t.get(ticketRef);
      if (!ticketDoc.exists) {
        throw new Error('Ticket not found');
      }

      const ticketData = ticketDoc.data();

      // Ensure attendee owns the ticket
      if (ticketData.userId !== userId) {
        throw new Error('Forbidden: You can only cancel your own tickets');
      }

      if (ticketData.status === 'cancelled') {
        throw new Error('Ticket is already cancelled');
      }

      const eventRef = db.collection('events').doc(ticketData.eventId);
      const eventDoc = await t.get(eventRef);

      // Increment available tickets back up if event exists
      if (eventDoc.exists) {
        const eventData = eventDoc.data();
        t.update(eventRef, {
          availableTickets: eventData.availableTickets + ticketData.quantity
        });
      }

      const updatedTicket = {
        ...ticketData,
        status: 'cancelled',
        cancelledAt: new Date().toISOString()
      };

      t.update(ticketRef, {
        status: 'cancelled',
        cancelledAt: updatedTicket.cancelledAt
      });

      return updatedTicket;
    });

    res.status(200).json({
      success: true,
      message: 'Ticket cancelled successfully and inventory restored',
      data: result
    });
  } catch (error) {
    const statusCode = error.message.includes('Forbidden') ? 403 : error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message
    });
  }
};
