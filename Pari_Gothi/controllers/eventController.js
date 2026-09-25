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
 * Get all events with optional filters (category, city)
 */
exports.getAllEvents = async (req, res, next) => {
  try {
    if (!checkDb(res)) return;

    const { category, city } = req.query;
    let query = db.collection('events');

    if (category) {
      query = query.where('category', '==', category);
    }

    const snapshot = await query.get();
    let events = [];

    snapshot.forEach((doc) => {
      events.push({ id: doc.id, ...doc.data() });
    });

    // In-memory filter for city on venue field (case-insensitive)
    if (city) {
      const cityLower = city.toLowerCase();
      events = events.filter((event) => {
        return event.venue && event.venue.toLowerCase().includes(cityLower);
      });
    }

    return res.status(200).json({
      success: true,
      count: events.length,
      data: events
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single event by ID with live ticket count
 */
exports.getEventById = async (req, res, next) => {
  try {
    if (!checkDb(res)) return;

    const { id } = req.params;
    const docRef = db.collection('events').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Event not found.'
      });
    }

    return res.status(200).json({
      success: true,
      data: { id: doc.id, ...doc.data() }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new event (Organizer only)
 */
exports.createEvent = async (req, res, next) => {
  try {
    if (!checkDb(res)) return;

    const {
      title,
      description,
      category,
      eventDate,
      venue,
      ticketPrice,
      totalCapacity
    } = req.body;

    if (!title || !category || !eventDate || !venue || ticketPrice === undefined || totalCapacity === undefined) {
      return res.status(400).json({
        success: false,
        message: 'All fields (title, category, eventDate, venue, ticketPrice, totalCapacity) are required.'
      });
    }

    const capacityNum = parseInt(totalCapacity, 10);
    const priceNum = parseFloat(ticketPrice);

    if (isNaN(capacityNum) || capacityNum <= 0) {
      return res.status(400).json({
        success: false,
        message: 'totalCapacity must be a positive integer.'
      });
    }

    if (isNaN(priceNum) || priceNum < 0) {
      return res.status(400).json({
        success: false,
        message: 'ticketPrice must be a non-negative number.'
      });
    }

    const eventDocRef = db.collection('events').doc();
    const createdAt = new Date().toISOString();

    const newEvent = {
      id: eventDocRef.id,
      title: title.trim(),
      description: description ? description.trim() : '',
      category: category.trim(),
      eventDate,
      venue: venue.trim(),
      organizerId: req.user.id,
      ticketPrice: priceNum,
      totalCapacity: capacityNum,
      availableTickets: capacityNum,
      createdAt
    };

    await eventDocRef.set(newEvent);

    return res.status(201).json({
      success: true,
      message: 'Event created successfully',
      data: newEvent
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update event details (Organizer must own the event)
 */
exports.updateEvent = async (req, res, next) => {
  try {
    if (!checkDb(res)) return;

    const { id } = req.params;
    const eventRef = db.collection('events').doc(id);
    const eventDoc = await eventRef.get();

    if (!eventDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Event not found.'
      });
    }

    const existingEvent = eventDoc.data();

    // Event owner verification
    if (existingEvent.organizerId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You can only update events that you created.'
      });
    }

    const {
      title,
      description,
      category,
      eventDate,
      venue,
      ticketPrice,
      totalCapacity
    } = req.body;

    const updates = {};
    if (title !== undefined) updates.title = title.trim();
    if (description !== undefined) updates.description = description.trim();
    if (category !== undefined) updates.category = category.trim();
    if (eventDate !== undefined) updates.eventDate = eventDate;
    if (venue !== undefined) updates.venue = venue.trim();
    if (ticketPrice !== undefined) {
      const priceNum = parseFloat(ticketPrice);
      if (isNaN(priceNum) || priceNum < 0) {
        return res.status(400).json({ success: false, message: 'Invalid ticketPrice' });
      }
      updates.ticketPrice = priceNum;
    }

    if (totalCapacity !== undefined) {
      const capacityNum = parseInt(totalCapacity, 10);
      if (isNaN(capacityNum) || capacityNum <= 0) {
        return res.status(400).json({ success: false, message: 'Invalid totalCapacity' });
      }
      const ticketsSold = existingEvent.totalCapacity - existingEvent.availableTickets;
      if (capacityNum < ticketsSold) {
        return res.status(400).json({
          success: false,
          message: `Cannot decrease totalCapacity below already booked tickets (${ticketsSold}).`
        });
      }
      updates.totalCapacity = capacityNum;
      updates.availableTickets = capacityNum - ticketsSold;
    }

    updates.updatedAt = new Date().toISOString();

    await eventRef.update(updates);

    const updatedDoc = await eventRef.get();
    return res.status(200).json({
      success: true,
      message: 'Event updated successfully',
      data: { id: updatedDoc.id, ...updatedDoc.data() }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete / Cancel event (Organizer must own the event)
 */
exports.deleteEvent = async (req, res, next) => {
  try {
    if (!checkDb(res)) return;

    const { id } = req.params;
    const eventRef = db.collection('events').doc(id);
    const eventDoc = await eventRef.get();

    if (!eventDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Event not found.'
      });
    }

    const eventData = eventDoc.data();

    // Event owner check
    if (eventData.organizerId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You can only delete events that you created.'
      });
    }

    await eventRef.delete();

    return res.status(200).json({
      success: true,
      message: 'Event deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * List registered attendees for an event (Organizer only, owner check)
 */
exports.getEventAttendees = async (req, res, next) => {
  try {
    if (!checkDb(res)) return;

    const { id } = req.params;
    const eventRef = db.collection('events').doc(id);
    const eventDoc = await eventRef.get();

    if (!eventDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Event not found.'
      });
    }

    const eventData = eventDoc.data();

    // Event owner verification
    if (eventData.organizerId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You can only view attendees for your own events.'
      });
    }

    const ticketsSnapshot = await db.collection('tickets')
      .where('eventId', '==', id)
      .get();

    const attendees = [];
    ticketsSnapshot.forEach((doc) => {
      attendees.push({ id: doc.id, ...doc.data() });
    });

    return res.status(200).json({
      success: true,
      eventId: id,
      eventTitle: eventData.title,
      totalBookings: attendees.length,
      data: attendees
    });
  } catch (error) {
    next(error);
  }
};
