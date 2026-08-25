#include "../include/Scheduler.h"
#include "../include/Floor.h"
#include "../include/Elevator.h"
#include <thread>
#include <iostream>

using namespace std;

int main(int argc, char *argv[]) {
    if(argc < 2) {
        cerr << "Usage: " << argv[0] << " <input_file>" << endl;
        return 1;
    }

    // Create Scheduler, Floor, and Elevator objects
    Scheduler scheduler;
    Floor floor(scheduler, 0);
    Elevator elevator(scheduler, 100);

    // Create threads for each object
    cerr << "Creating Scheduler thread" << endl;
    thread schedulerThread(&Scheduler::run, &scheduler);
    cerr << "Created: " << schedulerThread.get_id() << endl;

    cerr << "Creating Floor thread" << endl;
    thread floorThread(&Floor::run, &floor, argv[1]);
    cerr << "Created: " << floorThread.get_id() << endl;

    cerr << "Creating Elevator thread" << endl;
    thread elevatorThread(&Elevator::run, &elevator);
    cerr << "Created: " << elevatorThread.get_id() << endl;

    // Join threads
    schedulerThread.join();
    floorThread.join();
    elevatorThread.join();

    return 0;
}

