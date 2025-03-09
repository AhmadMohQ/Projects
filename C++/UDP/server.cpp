#include "Datagram.h"
#include <iostream>

int main() {
    try {
        DatagramSocket serverSocket(69); // Listen to port 69

        while (true) {
            std::vector<uint8_t> data(1024);
            DatagramPacket packet(data, data.size());
            serverSocket.receive(packet);

            // Print data from incoming request
            std::cout << "Server received:\n";
            for (size_t i = 0; i < packet.getLength(); ++i) {
                std::cout << static_cast<int>(data[i]) << " ";
            }
            std::cout << std::endl;

            // Check for validity
            if (packet.getLength() < 5 || data[0] != 0 || data[2] != 0) {
                throw std::runtime_error("Invalid.");
            }

            // Response per case
            std::vector<uint8_t> response;
            if (data[1] == 1) { // Case 1: Read request
                response = {0, 3, 0, 1}; // Read response
            } else if (data[1] == 2) { // Case 2: Write request
                response = {0, 4, 0, 0}; // Write response
            } else {
                throw std::runtime_error("Unknown request type.");
            }

            // Send response
            DatagramPacket responsePacket(response, response.size(), packet.getAddress(), packet.getPort());
            serverSocket.send(responsePacket);
            std::cout << "Server responded.\n";
        }

    } catch (const std::exception& e) {
        std::cerr << "Error: " << e.what() << std::endl;
    }
}
