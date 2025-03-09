#include "Context.cpp"

int main() {
    Context trafficLight;
    std::thread thread([&trafficLight]() {
    while (true) {
      std::this_thread::sleep_for(std::chrono::seconds(15));
      trafficLight.pedestrianWaiting();
    }
    });
    trafficLight.setState(std::make_unique<VehiclesGreen>());
    thread.join();
    return 0;
}
