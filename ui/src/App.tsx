import type React from "react";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { getRandomColor } from "../lib/util";

const WS_URL = "ws://192.168.8.101:4000/ws";
const MAX_RETRIES = 5;

interface CursorPosition {
	clientId: string;
	x: number;
	y: number;
	color: string;
}

function App() {
	const [retryCount, setRetryCount] = useState(0);
	const [cursors, setCursors] = useState<CursorPosition[]>([]);
	const [isConnected, setIsConnected] = useState(false);
	const socketRef = useRef<WebSocket | null>(null);
	const cursorColor = useMemo(() => getRandomColor(), []);

	useEffect(() => {
		const connectWebSocket = () => {
			const socket = new WebSocket(WS_URL);

			socket.onopen = () => {
				setRetryCount(0);
				setIsConnected(true);
				socketRef.current = socket;
			};

			socket.onmessage = (event) => {
				const data = JSON.parse(event.data);
				if (Array.isArray(data)) {
					setCursors(data);
				}
			};

			socket.onerror = (error) => {
				console.error("WebSocket Error:", error);
			};

			socket.onclose = () => {
				setIsConnected(false);
				socketRef.current = null;
				setRetryCount((prevCount) => prevCount + 1);
				if (retryCount < MAX_RETRIES) {
					setTimeout(connectWebSocket, 5000);
				}
			};
		};

		connectWebSocket();

		return () => {
			if (socketRef.current) {
				socketRef.current.close();
			}
		};
	}, [retryCount]);

	const handleMouseMove = useCallback(
		(event: React.MouseEvent) => {
			const { clientX, clientY } = event;

			if (isConnected && socketRef.current) {
				socketRef.current.send(
					JSON.stringify({
						x: clientX,
						y: clientY,
						color: cursorColor,
					}),
				);
			}
		},
		[isConnected, cursorColor],
	);

	useEffect(() => {
		if (retryCount >= MAX_RETRIES) {
			console.log("Max retries reached. Stopping reconnection attempts.");
		}
	}, [retryCount]);

	console.log(cursors);

	return (
		<div
			className="App"
			onMouseMove={handleMouseMove}
			style={{ width: "100vw", height: "100vh" }}
		>
			{cursors.map((cursor) => (
				<div
					key={cursor.clientId}
					style={{
						position: "fixed",
						transform: `translate(${cursor.x}px, ${cursor.y}px) rotate(15deg)`,
						left: -18,
						top: -18,
						pointerEvents: "none",
					}}
				>
					<svg fill="none" height="45" viewBox="0 0 17 18" width="45">
						<title>Cursor</title>
						<path
							d="M1.4964 3.11002L4.46428 15.4055C4.73338 16.5204 6.23625 16.7146 6.77997 15.7049L9.5237 10.6094L14.9962 8.65488C16.0841 8.26638 16.108 6.73663 15.0329 6.31426L3.16856 1.65328C2.22708 1.28341 1.25905 2.12672 1.4964 3.11002ZM9.43322 10.6417L9.43355 10.6416C9.43344 10.6416 9.43333 10.6416 9.43322 10.6417L9.34913 10.4062L9.43322 10.6417Z"
							fill={cursor.color}
							stroke="#fff"
							strokeWidth="1.5"
						/>
					</svg>
				</div>
			))}
		</div>
	);
}

export default App;
