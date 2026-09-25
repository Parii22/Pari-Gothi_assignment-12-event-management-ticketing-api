const swaggerJsDoc = require('swagger-jsdoc');
const path = require('path');

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Event Management & Ticketing REST API',
      version: '1.0.0',
      description: `
**Assignment 12: Event Management & Ticketing API**
Built with **Node.js**, **Express.js**, and **Google Firebase Firestore**.

### Key Features:
- 🔐 **JWT Authentication & RBAC**: Roles for Organizer and Attendee.
- 🎪 **Event Management**: Organizers can create, update, delete, and view attendees. Public users can browse and filter.
- 🎟️ **Atomic Ticket Booking**: Concurrency-safe Firestore transactions (\`runTransaction\`) ensuring tickets never oversell.
- ⚡ **Anti-Scalping Rate Limiting**: Max 10 booking requests/min per IP on \`/api/tickets/book\`.
- 🔁 **Atomic Ticket Cancellation**: Restores ticket inventory in Firestore transactions.
      `,
      contact: {
        name: 'Pari Gothi',
        email: 'support@example.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Local Development Server'
      },
      {
        url: '/',
        description: 'Current Environment / Production Server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token in the format: Bearer <token>'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'usr_organizer_01' },
            name: { type: 'string', example: 'Pari Gothi' },
            email: { type: 'string', format: 'email', example: 'pari@example.com' },
            role: { type: 'string', enum: ['organizer', 'attendee'], example: 'organizer' },
            createdAt: { type: 'string', format: 'date-time', example: '2026-03-01T12:00:00.000Z' }
          }
        },
        RegisterRequest: {
          type: 'object',
          required: ['name', 'email', 'password', 'role'],
          properties: {
            name: { type: 'string', example: 'Kunal Sharma' },
            email: { type: 'string', format: 'email', example: 'kunal@gmail.com' },
            password: { type: 'string', format: 'password', example: 'SecurePassword123!' },
            role: { type: 'string', enum: ['organizer', 'attendee'], example: 'attendee' }
          }
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email', example: 'kunal@gmail.com' },
            password: { type: 'string', format: 'password', example: 'SecurePassword123!' }
          }
        },
        Event: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'event_techconf_2026' },
            title: { type: 'string', example: 'Global Cloud & AI Summit 2026' },
            description: { type: 'string', example: 'Annual flagship backend conference' },
            category: { type: 'string', example: 'Technology' },
            eventDate: { type: 'string', format: 'date-time', example: '2026-06-15T09:00:00Z' },
            venue: { type: 'string', example: 'Bandra Kurla Complex, Mumbai' },
            organizerId: { type: 'string', example: 'usr_organizer_01' },
            ticketPrice: { type: 'number', example: 1499 },
            totalCapacity: { type: 'integer', example: 500 },
            availableTickets: { type: 'integer', example: 482 },
            createdAt: { type: 'string', format: 'date-time', example: '2026-03-01T12:00:00Z' }
          }
        },
        CreateEventRequest: {
          type: 'object',
          required: ['title', 'description', 'category', 'eventDate', 'venue', 'ticketPrice', 'totalCapacity'],
          properties: {
            title: { type: 'string', example: 'Global Cloud & AI Summit 2026' },
            description: { type: 'string', example: 'Annual flagship backend conference' },
            category: { type: 'string', example: 'Technology' },
            eventDate: { type: 'string', format: 'date-time', example: '2026-06-15T09:00:00Z' },
            venue: { type: 'string', example: 'Bandra Kurla Complex, Mumbai' },
            ticketPrice: { type: 'number', example: 1499 },
            totalCapacity: { type: 'integer', example: 500 }
          }
        },
        UpdateEventRequest: {
          type: 'object',
          properties: {
            title: { type: 'string', example: 'Global Cloud & AI Summit 2026 (Updated)' },
            description: { type: 'string', example: 'Updated description for the flagship conference' },
            category: { type: 'string', example: 'Technology' },
            eventDate: { type: 'string', format: 'date-time', example: '2026-06-16T10:00:00Z' },
            venue: { type: 'string', example: 'Jio World Convention Centre, Mumbai' },
            ticketPrice: { type: 'number', example: 1699 },
            totalCapacity: { type: 'integer', example: 600 }
          }
        },
        Ticket: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'ticket_rec_88219' },
            eventId: { type: 'string', example: 'event_techconf_2026' },
            eventTitle: { type: 'string', example: 'Global Cloud & AI Summit 2026' },
            userId: { type: 'string', example: 'usr_attendee_99' },
            attendeeName: { type: 'string', example: 'Kunal Sharma' },
            attendeeEmail: { type: 'string', format: 'email', example: 'kunal@gmail.com' },
            quantity: { type: 'integer', example: 2 },
            totalPaid: { type: 'number', example: 2998 },
            bookingRef: { type: 'string', example: 'TKT-2026-88219' },
            status: { type: 'string', enum: ['confirmed', 'cancelled'], example: 'confirmed' },
            bookedAt: { type: 'string', format: 'date-time', example: '2026-03-02T16:20:00Z' }
          }
        },
        BookTicketRequest: {
          type: 'object',
          required: ['eventId', 'quantity', 'attendeeName', 'attendeeEmail'],
          properties: {
            eventId: { type: 'string', example: 'event_techconf_2026' },
            quantity: { type: 'integer', minimum: 1, example: 2 },
            attendeeName: { type: 'string', example: 'Kunal Sharma' },
            attendeeEmail: { type: 'string', format: 'email', example: 'kunal@gmail.com' }
          }
        },
        ApiResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Operation completed successfully' },
            data: { type: 'object' }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Invalid request parameters' }
          }
        }
      }
    }
  },
  apis: [
    path.join(__dirname, '../routes/*.js'),
    path.join(__dirname, '../server.js')
  ]
};

const swaggerSpec = swaggerJsDoc(swaggerOptions);

module.exports = swaggerSpec;
