#include "Datagram.h"
#include <iostream>

int main() {
    try {
        DatagramSocket hostSocket(23); // Listening on port 23
        std::cout << "Intermediate Host listening on port 23...\n";

        while (true) {
            std::vector<uint8_t> data(1024); // Buffer for incoming data
            DatagramPacket incomingPacket(data, data.size());
            hostSocket.receive(incomingPacket);

            // Print the received request
            std::cout << "Received: ";
            for (size_t i = 0; i < incomingPacket.getLength(); ++i) {
                std::cout << static_cast<int>(data[i]) << " ";
            }
            std::cout << std::endl;

            DatagramSocket serverSocket; // Server com socket
            serverSocket.send(incomingPacket);

            // Wait for server response
            DatagramPacket response(data, data.size());
            serverSocket.receive(response);

            // Send server response to client
            hostSocket.send(response);

            std::cout << "Forwarded response to client.\n";
        }

    } 
    catch (const std::exception& e) {
        std::cerr << "Error: " << e.what() << std::endl;
    }
}