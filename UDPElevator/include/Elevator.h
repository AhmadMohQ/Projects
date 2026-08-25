#ifndef ELEVATOR_H
#define ELEVATOR_H

#include "Data.h"
#include "Scheduler.h"

/**
 * Class Elevator:
 *  - Receives data from Scheduler (must be from Floor)
 *  - Modifies data_t source to Elevator
 *  - Sends data back to Scheduler
 */
class Elevator {
private:
    data_t elevData;       // Data for this Elevator
    int elevID;            // Elevator ID
    Scheduler& scheduler;  // Reference to Scheduler
    bool empty;            // If Elevator currently has data to send

public:
    /**
     * Constructor
     * @param schedulerRef Reference to Scheduler
     * @param id Elevator ID
     */
    Elevator(Scheduler& schedulerRef, int id);

    /**
     * Main Elevator thread function.
     */
    void run();
};

#endif // ELEVATOR_H
