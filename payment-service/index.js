const amqp = require('amqplib');
const express = require('express');
const client = require('prom-client');

// --- Metrics Setup ---
const app = express();
const PORT = 3002;
client.collectDefaultMetrics();
const paymentCounter = new client.Counter({
    name: 'ecommerce_payments_processed',
    help: 'Total processed payments'
});

app.get('/metrics', async (req, res) => {
    res.set('Content-Type', client.register.contentType);
    res.end(await client.register.metrics());
});

app.listen(PORT, () => console.log(`Payment Metrics server running on port ${PORT}`));

// --- RabbitMQ Connection with Retry ---
async function connect() {
    // 1. Log the URL to verify we are NOT using localhost
    const amqpServer = process.env.AMQP_URL || 'amqp://localhost:5672';
    console.log(`[Payment Service] Connecting to RabbitMQ at: ${amqpServer}`);

    try {
        const connection = await amqp.connect(amqpServer);
        const channel = await connection.createChannel();
        await channel.assertExchange('ecommerce_exchange', 'direct', { durable: true });

        const q = await channel.assertQueue('payment_queue');
        await channel.bindQueue(q.queue, 'ecommerce_exchange', 'order.created');

        console.log("[Payment Service] Connected & Waiting for orders...");

        channel.consume(q.queue, (data) => {
            const order = JSON.parse(data.content);
            setTimeout(() => {
                order.status = "PAID";
                channel.publish('ecommerce_exchange', 'payment.processed', Buffer.from(JSON.stringify(order)));
                paymentCounter.inc();
                console.log(`[Payment] Processed Order ${order.id}`);
                channel.ack(data);
            }, 1000);
        });

        // Handle connection close
        connection.on("close", () => {
            console.error("[Payment Service] Connection closed, retrying...");
            setTimeout(connect, 5000);
        });

    } catch (error) {
        console.error(`[Payment Service] Failed to connect: ${error.message}`);
        console.error("[Payment Service] Retrying in 5 seconds...");
        setTimeout(connect, 5000); 
    }
}

connect();