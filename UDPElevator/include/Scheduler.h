#ifndef SCHEDULER_H
#define SCHEDULER_H

#include "Data.h"
#include <mutex>
#include <condition_variable>
#include <iostream>

/**
 * Class Scheduler: Serves as the data exchange point between Floor and Elevator.
 * Holds one data_t entry at a time and controls access via mutex/condition_variable.
 */
 class Scheduler {
 private:
     data_t heldData;
     bool empty;
     std::mutex mtx;
     std::condition_variable cv;

 public:
     // Constructor
     Scheduler();
     // Main Scheduler thread function
     void run();
     // Puts data in Scheduler
     void put(data_t newData);
     // Retrieves data from the Scheduler.
     data_t get(int destination);
 };

#endif // SCHEDULER_H
