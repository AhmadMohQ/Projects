#ifndef DATA_H
#define DATA_H
/**
 * Struct to hold all data being passed between threads.
 */
typedef struct data_t {
    int time = 0;
    int elevNum = -1;
    int floorNum = -1;
    int button = 0;
    int source = -1;
} data_t;

#endif
