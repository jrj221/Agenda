// Minimal Yjs sync WebSocket server.
// Each connection joins a "room" (the path of the URL). All updates
// broadcast to other peers in the same room. State is held in memory
// only — restart the server and the room is empty until a client
// re-syncs from its own copy. No persistence by design (local dev only).

import { WebSocketServer } from "ws";
import * as Y from "yjs";
import * as syncProtocol from "y-protocols/sync";
import * as awarenessProtocol from "y-protocols/awareness";
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";

const MESSAGE_SYNC = 0;
const MESSAGE_AWARENESS = 1;

const rooms = new Map();

function getRoom(name) {
	let room = rooms.get(name);
	if (room) return room;

	const ydoc = new Y.Doc();
	const awareness = new awarenessProtocol.Awareness(ydoc);
	awareness.setLocalState(null);
	room = { ydoc, awareness, conns: new Set() };

	ydoc.on("update", (update, origin) => {
		const enc = encoding.createEncoder();
		encoding.writeVarUint(enc, MESSAGE_SYNC);
		syncProtocol.writeUpdate(enc, update);
		const msg = encoding.toUint8Array(enc);
		for (const conn of room.conns) if (conn !== origin) send(conn, msg);
	});

	awareness.on("update", ({ added, updated, removed }, origin) => {
		const changed = added.concat(updated, removed);
		const enc = encoding.createEncoder();
		encoding.writeVarUint(enc, MESSAGE_AWARENESS);
		encoding.writeVarUint8Array(enc, awarenessProtocol.encodeAwarenessUpdate(awareness, changed));
		const msg = encoding.toUint8Array(enc);
		for (const conn of room.conns) {
			// Don't echo a peer's own awareness update back to it.
			if (conn !== origin) send(conn, msg);
		}
	});

	rooms.set(name, room);
	return room;
}

function send(conn, msg) {
	if (conn.readyState !== conn.OPEN) return;
	try { conn.send(msg); } catch { conn.close(); }
}

function onMessage(conn, room, data) {
	const dec = decoding.createDecoder(data);
	const enc = encoding.createEncoder();
	const type = decoding.readVarUint(dec);
	switch (type) {
		case MESSAGE_SYNC:
			encoding.writeVarUint(enc, MESSAGE_SYNC);
			syncProtocol.readSyncMessage(dec, enc, room.ydoc, conn);
			if (encoding.length(enc) > 1) send(conn, encoding.toUint8Array(enc));
			break;
		case MESSAGE_AWARENESS:
			awarenessProtocol.applyAwarenessUpdate(room.awareness, decoding.readVarUint8Array(dec), conn);
			break;
	}
}

function onConnection(conn, req) {
	const roomName = decodeURIComponent((req.url || "/").slice(1).split("?")[0]) || "default";
	const room = getRoom(roomName);
	room.conns.add(conn);
	conn.binaryType = "arraybuffer";

	conn.on("message", (data) => onMessage(conn, room, new Uint8Array(data)));
	conn.on("close", () => {
		room.conns.delete(conn);
		awarenessProtocol.removeAwarenessStates(room.awareness, [conn.clientID || 0], null);
		if (room.conns.size === 0) {
			// Free memory for empty rooms. State is lost — fine for dev.
			rooms.delete(roomName);
		}
	});

	// Step 1: send our state vector so the client can reply with missing updates.
	{
		const enc = encoding.createEncoder();
		encoding.writeVarUint(enc, MESSAGE_SYNC);
		syncProtocol.writeSyncStep1(enc, room.ydoc);
		send(conn, encoding.toUint8Array(enc));
	}
	// Send current awareness states.
	const states = room.awareness.getStates();
	if (states.size > 0) {
		const enc = encoding.createEncoder();
		encoding.writeVarUint(enc, MESSAGE_AWARENESS);
		encoding.writeVarUint8Array(enc, awarenessProtocol.encodeAwarenessUpdate(room.awareness, Array.from(states.keys())));
		send(conn, encoding.toUint8Array(enc));
	}
}

const port = Number(process.env.PORT) || 1234;
const wss = new WebSocketServer({ port });
wss.on("connection", onConnection);
console.log(`[sync] Yjs sync server listening on ws://localhost:${port}`);
