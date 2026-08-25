#ifndef FLOOR_H
#define FLOOR_H

#include "Data.h"
#include "Scheduler.h"
#include <string>

/**
 * Class Floor:
 *  - Reads input data from file
 *  - Sends data to Scheduler
 *  - Receives data back from Scheduler
 */
class Floor {
private:
    data_t floorData;      // Data for this Floor
    int floorID;           // ID of this Floor (not heavily used in Iteration 1)
    Scheduler& scheduler;  // Reference to the Scheduler
    bool empty;            // If Floor currently has data to send

public:
    /**
     * Constructor
     * @param schedulerRef Reference to the Scheduler
     * @param id Floor ID
     */
    Floor(Scheduler& schedulerRef, int id);

    /**
     * Main Floor thread function.
     * Reads from file, sends data to Scheduler, receives data back, exits.
     */
    void run(std::string inputFileName);
};

#endif // FLOOR_H

