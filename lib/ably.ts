import * as Ably from "ably";

let client: Ably.Realtime | null = null;
let currentUserId: string | null = null;

export const getAblyClient = (userId: string | undefined): Ably.Realtime | null => {
    if (!userId) {
        if (client) {
            client.close();
            client = null;
            currentUserId = null;
        }
        return null;
    }

    if (client && currentUserId !== userId) {
        try {
            client.close();
        } catch (e) {
            console.warn("Error closing Ably client during user swap:", e);
        }
        client = null;
    }

    if (!client) {
        client = new Ably.Realtime({
            authUrl: "/api/notifications/token",
            authMethod: "POST",
            clientId: userId,
            recover: (_, cb) => cb(true),
        });
        currentUserId = userId;

        client.connection.on("connected", () => {
        });

        client.connection.on("failed", () => {
            // handle failed
        });
    }

    return client;
};

export const disconnectAbly = () => {
    if (client) {
        client.close();
        client = null;
        currentUserId = null;
    }
};
