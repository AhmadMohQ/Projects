#include <thread>
#include <iostream>
#include <random>
#include <mutex>
#include <condition_variable>
#include <string>
#include <vector>

class SandwichMaking {
private:
    std::mutex mtx;
    std::condition_variable cv;
    bool ingredientsOnTable = false;
    std::string ingredient1, ingredient2;
    const std::vector<std::string> ingredients = {"bread", "peanut butter", "jam"};
    int sandwichesMade = 0;
    const int maxSandwiches = 20;
    bool terminate = false; // Termination signal

    void getRandomIngredients(std::string& out1, std::string& out2) {
        static std::default_random_engine generator(std::random_device{}());
        static std::uniform_int_distribution<int> distribution(0, 2);
        int first = distribution(generator);
        int second;
        do {
            second = distribution(generator);
        } while (first == second);
        out1 = ingredients[first];
        out2 = ingredients[second];
    }

public:
    void agent() {
        while (true) {
            std::unique_lock<std::mutex> lock(mtx);

            // Wait until table is empty or termination
            cv.wait(lock, [this]() { return !ingredientsOnTable || terminate; });

            if (terminate) break;

            // Place two random ingredients
            getRandomIngredients(ingredient1, ingredient2);
            std::cout << "Agent placed: " << ingredient1 << " and " << ingredient2 << std::endl;
            ingredientsOnTable = true;

            // Notify chefs
            cv.notify_all();
        }
    }

    void chef(const std::string& ownIngredient) {
        while (true) {
            std::unique_lock<std::mutex> lock(mtx);

            // Wait for ingredients or termination
            cv.wait(lock, [this, &ownIngredient]() {
                return (ingredientsOnTable &&
                        ingredient1 != ownIngredient &&
                        ingredient2 != ownIngredient) ||
                       terminate;
            });

            if (terminate) break;

            // Make and eat sandwich
            if (sandwichesMade < maxSandwiches) {
                std::cout << "Mr " << ownIngredient << " man makes and eats his sandwich." << std::endl;
                sandwichesMade++;
            }

            if (sandwichesMade >= maxSandwiches) {
                terminate = true; // Signal termination
                cv.notify_all();
            }

            // Clear table and notify agent
            ingredientsOnTable = false;
            cv.notify_all();
        }
    }
};

int main() {
    SandwichMaking sandwichSystem;

    // Create threads
    std::thread agentThread(&SandwichMaking::agent, &sandwichSystem);
    std::thread chef1(&SandwichMaking::chef, &sandwichSystem, "bread");
    std::thread chef2(&SandwichMaking::chef, &sandwichSystem, "peanut butter");
    std::thread chef3(&SandwichMaking::chef, &sandwichSystem, "jam");

    // Join threads
    agentThread.join();
    chef1.join();
    chef2.join();
    chef3.join();

    std::cout << "\nI FINISH MY BEENUT BUTTAR SANWISH" << std::endl;
    return 0;
}
