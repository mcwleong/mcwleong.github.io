import ssl
from http.server import HTTPServer, SimpleHTTPRequestHandler
import socket

def get_local_ip():
    # Get the local IP address
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # doesn't need to be reachable
        s.connect(('10.255.255.255', 1))
        IP = s.getsockname()[0]
    except Exception:
        IP = '127.0.0.1'
    finally:
        s.close()
    return IP

# Define the server address
host = get_local_ip()  # This gets your computer's local IP address
port = 4443       # Standard HTTPS port is 443, but we'll use 4443 for testing

# Create an HTTP server with the specified handler
server = HTTPServer((host, port), SimpleHTTPRequestHandler)

# Create SSL context
context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
context.load_cert_chain('server.crt', 'server.key')

# Wrap the socket with SSL
server.socket = context.wrap_socket(server.socket, server_side=True)

print(f"Server started at https://{host}:{port}")
print("To access from Android device, make sure both devices are on the same network")

# Start the server
try:
    server.serve_forever()
except KeyboardInterrupt:
    print("\nShutting down the server...")
    server.server_close() 