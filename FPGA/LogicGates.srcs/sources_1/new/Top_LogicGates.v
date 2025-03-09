`timescale 1ns / 1ps
//////////////////////////////////////////////////////////////////////////////////
// Company: 
// Engineer: 
// 
// Create Date: 01/13/2025 01:28:20 PM
// Design Name: 
// Module Name: Top_LogicGates
// Project Name: 
// Target Devices: 
// Tool Versions: 
// Description: 
// 
// Dependencies: 
// 
// Revision:
// Revision 0.01 - File Created
// Additional Comments:
// 
//////////////////////////////////////////////////////////////////////////////////

// Ahmad Mohamad
// 101230403
module Top_LogicGates(
    input [1:0] sw,     // 2 bit input from switches
    output [3:0] led    // 4 bit output to LEDs
    );
    
    // Setting up the logic Gate Module
   LogicGates Board (
    .A(sw[0]),
    .B(sw[1]),
    .Z(led)
   );

endmodule
