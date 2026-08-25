#include "../include/Scheduler.h"
#include <cstdlib>  // for exit()

using namespace std;

Scheduler::Scheduler() : empty(true) {
    // heldData defaults are fine from the data_t struct initialization
}

void Scheduler::run() {
    cerr << "Entered Scheduler." << endl;
    // Iteration 1: The Scheduler run loop is effectively empty
    while(true) { }
}

void Scheduler::put(data_t newData) {
    unique_lock<mutex> lock(mtx);

    while(!empty) {
        cv.wait(lock);
    }
    heldData = newData;  // Store the data

    // Output source
    switch (heldData.source) {
        case 0:
            cerr << "Obtained data from floor" << endl;
            break;
        case 1:
            cerr << "Obtained data from elevator" << endl;
            break;
        default:
            cerr << "Invalid source. Exiting." << endl;
            exit(1);
    }

    empty = false;
    cv.notify_all();
}

data_t Scheduler::get(int destination) {
    unique_lock<mutex> lock(mtx);

    // Wait until scheduler has data AND that data is valid for this destination
    while (empty || (destination == heldData.source)) {
        cv.wait(lock);
    }

    // Return the data
    data_t dataOut = heldData;

    // For iteration 1, we only store a single data item at a time
    // so once it's taken, we consider the scheduler empty again.
    empty = true;

    cv.notify_all();
    return dataOut;
}
