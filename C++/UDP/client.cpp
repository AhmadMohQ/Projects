#include "Datagram.h"
#include <iostream>
#include <vector>
#include <string>

int main() {
    try {
        DatagramSocket clientSocket;

        for (int i = 0; i < 11; ++i) {
            std::vector<uint8_t> data;

            std::string requestType = (i % 2 == 0) ? "read" : "write";
            uint8_t requestCode = (requestType == "read") ? 1 : 2;

            data.push_back(0);  // Starting byte
            data.push_back(requestCode);  // 1 for Read and 2 for Write 

            std::string filename = "test.txt";
            data.insert(data.end(), filename.begin(), filename.end());
            data.push_back(0);  // Null byte 

            std::string mode = "octet";
            data.insert(data.end(), mode.begin(), mode.end());
            data.push_back(0); 

            DatagramPacket packet(data, data.size(), inet_addr("127.0.0.1"), 23);

            std::cout << "Client Request (" << requestType << "): ";
            for (size_t j = 0; j < data.size(); ++j) {
                std::cout << static_cast<int>(data[j]) << " ";
            }
            std::cout << std::endl;

            clientSocket.send(packet);

            DatagramPacket response(std::vector<uint8_t>(512), 512);
            clientSocket.receive(response);

            std::cout << "Client Response: ";
            uint8_t* responseData = const_cast<uint8_t*>(static_cast<const uint8_t*>(response.getData()));
            for (size_t j = 0; j < response.getLength(); ++j) {
                std::cout << static_cast<int>(responseData[j]) << " ";
            }
            std::cout << std::endl;
        }
    } catch (const std::exception& e) {
        std::cerr << "Error: " << e.what() << std::endl;
    }

    return 0;
}