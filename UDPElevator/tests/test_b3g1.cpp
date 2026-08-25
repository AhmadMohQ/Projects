#include <gtest/gtest.h>
#include <thread>
#include <chrono>
#include <fstream>
#include <string>
#include <cerrno>
#include "Scheduler.h"
#include "Floor.h"
#include "Elevator.h"

/*
 Death test are used to correctly capture the exit codes, since normal gtests do not explicitly handle
 asserts for exit statements.
*/

/** --------------------------------------------------------------------------
   1) SCHEDULER normal test (if any scenario doesn't call exit)
   -------------------------------------------------------------------------- */
TEST(SchedulerTest, PutAndGetValidData)
{
// This scenario uses a valid source=0 or source=1, so no exit(...) is triggered.
    Scheduler scheduler;

    data_t sampleData;
    sampleData.time = 42;
    sampleData.elevNum = 1;
    sampleData.floorNum = 5;
    sampleData.button = 2;
    sampleData.source = 0; // from Floor => valid

    // Put data => should NOT exit
    scheduler.put(sampleData);

    // Get data as an Elevator => also valid => no exit
    data_t received = scheduler.get(1);
    EXPECT_EQ(received.time, 42);
    EXPECT_EQ(received.elevNum, 1);
    EXPECT_EQ(received.floorNum, 5);
    EXPECT_EQ(received.button, 2);
    EXPECT_EQ(received.source, 0);
}

/** --------------------------------------------------------------------------
   2) SCHEDULER DEATH TEST for invalid source => exit(1)
   -------------------------------------------------------------------------- */
TEST(SchedulerDeathTest, InvalidSourceExits)
{
    EXPECT_EXIT(
    {
        Scheduler scheduler;
        data_t badData;
        badData.source = 99; // invalid => triggers exit(1)
        scheduler.put(badData);
    },
    ::testing::ExitedWithCode(1),
    "Invalid source.*Exiting"
    );
}
/** --------------------------------------------------------------------------
   3) FLOOR DEATH TEST: Calls exit(0) after transferring data once
   -------------------------------------------------------------------------- */
TEST(FloorDeathTest, SinglePassExits)
{
    EXPECT_EXIT(
    {
        // Create the input file
        std::ofstream ofs("temp_test_input.txt");
        ofs << "100,2,3,1\n";
        ofs.close();

        Scheduler scheduler;
        Floor floor(scheduler, 0);
        Elevator elevator(scheduler, 100);

        std::thread elevThread(&Elevator::run, &elevator);

        // Now run the Floor. It should eventually call exit(0).
        floor.run("temp_test_input.txt");

        // we can detach the elevator thread to avoid a hang, if exit didnt get called
        elevThread.detach();
    },
        ::testing::ExitedWithCode(0),
        "Data has successfully been transferred to and from elevator. Exiting."
        );
}
/** --------------------------------------------------------------------------
   4) MULTITHREAD / CONCURRENCY DEATH TEST
   Because your concurrency calls exit(0) once Floor has done a full cycle,
   we treat the entire concurrency flow as a death test too.
   -------------------------------------------------------------------------- */
TEST(ConcurrencyDeathTest, SchedulerFloorElevatorBasicFlow)
{
    // We expect Floor to eventually call exit(0).
    EXPECT_EXIT(
    {
        Scheduler scheduler;
        Floor floor(scheduler, 0);
        Elevator elevator(scheduler, 100);

        std::string dummyFile = "dummy_input.txt";
        std::ofstream ofs(dummyFile);
        ofs << "111,101,5,9\n";
        ofs.close();

        // Start threads
        std::thread schedulerThread(&Scheduler::run, &scheduler);
        std::thread floorThread(&Floor::run, &floor, dummyFile);
        std::thread elevatorThread(&Elevator::run, &elevator);

        // so the exit can happen:
        std::this_thread::sleep_for(std::chrono::seconds(2));

    },
    ::testing::ExitedWithCode(0),
    "Data has successfully been transferred to and from elevator. Exiting."
    );
}
