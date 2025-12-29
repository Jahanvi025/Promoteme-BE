import { Server as SocketIOServer } from "socket.io";
import { sendMessage, markMessagesAsSeen } from "./conversation";

const socketHandler = (server: any) => {
    const io = new SocketIOServer(server, {
        pingTimeout: 60000,
        path: "/api/socket",
        // transports: ["polling"],
        cors: {
            origin: '*'
        }
    });

    io.on("connection", (socket) => {
        console.log("A new user is connected");

        socket.on("setup", (userData) => {
            socket.join(userData);
            socket.emit('connected');
            console.log('A user is connected with userId', userData);
        });

        socket.on("join chat", (room) => {
            socket.join(room);
            console.log("User joined room:", room);
        });

        socket.on("typing", (room) => {
            socket.in(room).emit("typing", { user: socket.id });
        });

        socket.on("stop typing", (room) => {
            socket.in(room).emit("stop typing", { user: socket.id });
        });

        socket.on("new message", (newMessageReceived) => {
            const recipientId = newMessageReceived.to;

            if (!recipientId) {
                return console.log("Recipient ID is not present in the message");
            }

            sendMessage(newMessageReceived);

            socket.to(recipientId).emit("message received", newMessageReceived);
            console.log("Message sent to:", recipientId);
        });

        socket.on("view conversation", async ({ conversationId, userId }) => {
            try {
                await markMessagesAsSeen(conversationId, userId);
            } catch (error) {
                console.error("Error marking messages as seen:", error);
            }
        });

        socket.on('disconnect', () => {
            console.log('A client disconnected');
        });
    });

    return io;
};

export default socketHandler;
