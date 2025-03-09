#include <iostream>
#include <thread>
#include <chrono>
#include <memory>

class Context;

class State {
public:
    virtual void pedestrianWaiting(Context& context) = 0;
    virtual void timeout(Context& context) = 0;
    virtual ~State() {}
};

class VehiclesGreen;
class VehiclesIG;
class VehiclesYellow;
class PedestriansWalk;
class PedestriansFlash;


class Context {
private:
    std::unique_ptr<State> currentState;
    bool isPedestrianWaiting;

public:
    Context();
    void setState(std::unique_ptr<State> state);
    void pedestrianWaiting();
    void timeout();
    bool getPedestrianWaiting() const;
    void resetPedestrianWaiting();
};


class VehiclesGreen : public State {
public:
    void pedestrianWaiting(Context& context) override;
    void timeout(Context& context) override;
};

class VehiclesIG : public State {
public:
    void pedestrianWaiting(Context& context) override;
    void timeout(Context& context) override;
};

class VehiclesYellow : public State {
public:
    void pedestrianWaiting(Context& context) override;
    void timeout(Context& context) override;
};


class PedestriansWalk : public State {
public:
    void pedestrianWaiting(Context& context) override;
    void timeout(Context& context) override;
};


class PedestriansFlash : public State {
private:
    static int pedestrianFlashCtr;
public:
    void pedestrianWaiting(Context& context) override;
    void timeout(Context& context) override;
};


Context::Context() : isPedestrianWaiting(false), currentState(std::make_unique<VehiclesGreen>()) {}

void Context::setState(std::unique_ptr<State> state) {
    currentState = std::move(state);
    timeout();
}

void Context::pedestrianWaiting() {
    isPedestrianWaiting = true;
    currentState->pedestrianWaiting(*this);
}

void Context::timeout() {
    currentState->timeout(*this);
}

bool Context::getPedestrianWaiting() const {
    return isPedestrianWaiting;
}

void Context::resetPedestrianWaiting() {
    isPedestrianWaiting = false;
}


void VehiclesGreen::pedestrianWaiting(Context& context) {
    std::cout << "Pedestrian waiting" << std::endl;
}

void VehiclesIG::pedestrianWaiting(Context& context) {
    std::cout << "Pedestrian waiting" << std::endl;
}

void VehiclesGreen::timeout(Context& context) {
    std::cout << "Vehicles Green." << std::endl;
    std::this_thread::sleep_for(std::chrono::seconds(10));
    context.setState(std::make_unique<VehiclesIG>());
}

void VehiclesIG::timeout(Context& context) {
    while(!context.getPedestrianWaiting()) {
        //do nothing
    }
    std::cout << "Switching to yellow." << std::endl;
    std::this_thread::sleep_for(std::chrono::seconds(10));
    context.setState(std::make_unique<VehiclesYellow>());
}

void VehiclesYellow::pedestrianWaiting(Context& context) {
    std::cout << "Transitioning, pedestrian waiting." << std::endl;
}

void VehiclesYellow::timeout(Context& context) {
    std::cout << "Switching to red." << std::endl;
    std::this_thread::sleep_for(std::chrono::seconds(3));
    context.setState(std::make_unique<PedestriansWalk>());
}

void PedestriansWalk::pedestrianWaiting(Context& context) {
    std::cout << "Pedestrians walking." << std::endl;
}

void PedestriansWalk::timeout(Context& context) {
    std::cout << "Switching to Flashing." << std::endl;
    context.setState(std::make_unique<PedestriansFlash>());
}


void PedestriansFlash::pedestrianWaiting(Context& context) {
    std::cout << "Flashing state." << std::endl;
}

void PedestriansFlash::timeout(Context& context) {
    pedestrianFlashCtr--;
    if (pedestrianFlashCtr & 1) {
        std::cout << "DON'T WALK light OFF.\n";
    std::this_thread::sleep_for(std::chrono::seconds(1));
    } else if (pedestrianFlashCtr == 0) {
        pedestrianFlashCtr = 7;
    context.setState(std::make_unique<VehiclesGreen>());
    }else {
        std::cout << "DON'T WALK light ON.\n";
        std::this_thread::sleep_for(std::chrono::seconds(1));
    }
    context.setState(std::make_unique<PedestriansFlash>());
}
int PedestriansFlash::pedestrianFlashCtr = 7;
