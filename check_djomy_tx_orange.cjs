const crypto = require('crypto');

const DJOMY_CLIENT_ID = "djomy-client-1781800938488-6dd9";
const DJOMY_CLIENT_SECRET = "s3cr3t-2MkVrxI58qJt0QfedkILKMk8N1WmZbzB";
const baseUrl = "https://sandbox-api.djomy.africa";

function calculateHmacHex(key, message) {
    return crypto.createHmac('sha256', key).update(message).digest('hex');
}

async function run() {
    try {
        // 1. Authenticate to get Bearer Token
        const authSig = calculateHmacHex(DJOMY_CLIENT_SECRET, DJOMY_CLIENT_ID);
        const authResponse = await fetch(`${baseUrl}/v1/auth`, {
            method: 'POST',
            headers: {
                "X-API-KEY": `${DJOMY_CLIENT_ID}:${authSig}`,
                "Content-Type": "application/json"
            }
        });

        if (!authResponse.ok) {
            console.error("Auth failed with status:", authResponse.status);
            return;
        }

        const authData = await authResponse.json();
        const bearerToken = authData.token || authData.data?.token || authData.data?.accessToken || authData.accessToken;
        if (!bearerToken) {
            console.error("Missing bearer token in response:", authData);
            return;
        }

        // 2. Query Transaction Status
        const djomyTxId = "c07beeb9-ad8b-4a8f-b6af-d2280188735f";
        const querySig = calculateHmacHex(DJOMY_CLIENT_SECRET, DJOMY_CLIENT_ID);

        console.log("Querying status of Djomy transaction:", djomyTxId);
        const statusResponse = await fetch(`${baseUrl}/v1/payments/${djomyTxId}/status`, {
            method: 'GET',
            headers: {
                "Authorization": `Bearer ${bearerToken}`,
                "X-API-KEY": `${DJOMY_CLIENT_ID}:${querySig}`
            }
        });

        console.log("Status Code:", statusResponse.status);
        const statusData = await statusResponse.json();
        console.log("Transaction Data:", JSON.stringify(statusData, null, 2));

    } catch (err) {
        console.error("Fatal error:", err);
    }
}

run();
