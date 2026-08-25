#include "../include/Floor.h"
#include <fstream>     // for ifstream
#include <iostream>
#include <thread>      // for this_thread
#include <chrono>      // for chrono::milliseconds
#include <cstdlib>     // for exit()

using namespace std;

Floor::Floor(Scheduler& schedulerRef, int id)
        : floorID(id), scheduler(schedulerRef), empty(true) {
    // floorData is default-initialized from data_t struct
}

void Floor::run(string inputFileName) {
    ifstream inputData(inputFileName);
    if(!inputData.is_open()) {
        cerr << "Error opening input file: " << inputFileName << endl;
        exit(1);
    }

    // For Iteration 1, assume only one line of input
    string line;
    while(getline(inputData, line, ',')) {
        floorData.time = stoi(line);
        getline(inputData, line, ',');
        floorData.elevNum = stoi(line);
        getline(inputData, line, ',');
        floorData.floorNum = stoi(line);
        getline(inputData, line);
        floorData.button = stoi(line);
        floorData.source = 0; // from Floor
    }
    inputData.close();

    // Now we have 1 data_t from the file
    empty = false;

    while(true) {
        if(!empty) {
            // Send data to Scheduler
            scheduler.put(floorData);
            empty = true;
            this_thread::sleep_for(chrono::milliseconds(500));
        }

        if(empty) {
            // Retrieve data from Scheduler (which should be from Elevator)
            floorData = scheduler.get(0);   // 0 => Floor destination
            floorData.source = 0;          // Mark source as Floor for next pass
            empty = false;

            cerr << "Floor received data from scheduler" << endl;
            this_thread::sleep_for(chrono::milliseconds(500));

            cerr << "Data has successfully been transferred to and from elevator. Exiting." << endl;
            exit(0);  // For Iteration 1 demonstration only
        }
    }
}

