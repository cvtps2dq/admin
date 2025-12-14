const express = require('express');
const amqp = require('amqplib');
const client = require('prom-client');

const app = express();
app.use(express.json());
const PORT = 3001;

// --- Metrics Setup ---
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics();
const orderCounter = new client.Counter({
    name: 'ecommerce_orders_total',
    help: 'Total number of orders placed'
});

// --- RabbitMQ Setup ---
let channel;
let connection;

async function connectToRabbit() {
    const amqpServer = process.env.AMQP_URL || 'amqp://localhost:5672';
    console.log(`[Order Service] Attempting connection to: ${amqpServer}`);

    try {
        connection = await amqp.connect(amqpServer);
        channel = await connection.createChannel();
        await channel.assertExchange('ecommerce_exchange', 'direct', { durable: true });

        console.log("[Order Service] Connected to RabbitMQ");

        connection.on("close", () => {
            console.error("[Order Service] Connection lost. Retrying...");
            channel = null;
            setTimeout(connectToRabbit, 5000);
        });

    } catch (error) {
        console.error(`[Order Service] Failed to connect: ${error.message}`);
        console.error("[Order Service] Retrying in 5 seconds...");
        setTimeout(connectToRabbit, 5000);
    }
}

// Start connection logic
connectToRabbit();

// --- API Routes ---
app.post('/orders', async (req, res) => {
    // Safety check: ensure RabbitMQ is ready
    if (!channel) {
        return res.status(503).json({
            error: "Service unavailable: RabbitMQ connection not yet established."
        });
    }

    const order = req.body;
    order.id = Date.now();
    order.status = "PENDING";

    try {
        channel.publish(
            'ecommerce_exchange',
            'order.created',
            Buffer.from(JSON.stringify(order))
        );

        orderCounter.inc();
        console.log(`[Order] Sent order ${order.id}`);
        res.json({ message: "Order placed", orderId: order.id });
    } catch (e) {
        console.error("Error publishing message", e);
        res.status(500).json({ error: "Internal Error" });
    }
});

app.get('/metrics', async (req, res) => {
    res.set('Content-Type', client.register.contentType);
    res.end(await client.register.metrics());
});

app.listen(PORT, () => {
    console.log(`Order Service running on port ${PORT}`);
});