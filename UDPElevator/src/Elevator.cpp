#include "../include/Elevator.h"
#include <thread>
#include <chrono>
#include <iostream>

using namespace std;

Elevator::Elevator(Scheduler& schedulerRef, int id)
        : elevID(id), scheduler(schedulerRef), empty(true) {
    // elevData default initializes from data_t
}

void Elevator::run() {
    while(true) {
        if(!empty) {
            cerr << "Elevator sending to scheduler" << endl;
            scheduler.put(elevData);
            empty = true;
            this_thread::sleep_for(chrono::milliseconds(500));
        }

        if(empty) {
            // Attempt to fetch data that originated from Floor
            elevData = scheduler.get(1);  // 1 => Elevator
            elevData.source = 1;         // Mark data as from Elevator
            empty = false;
            this_thread::sleep_for(chrono::milliseconds(500));
            cerr << "Elevator received data from scheduler" << endl;
        }
    }
}
