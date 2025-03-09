`timescale 1ns / 1ps
//////////////////////////////////////////////////////////////////////////////////
// Company: 
// Engineer: 
// 
// Create Date: 01/13/2025 12:02:12 PM
// Design Name: 
// Module Name: LogicGates
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
// Ahmad Mohamad 
// 101230403 
//////////////////////////////////////////////////////////////////////////////////


module LogicGates(
    input A,
    input B,
    output [3:0] Z
    );
    
assign Z[0] = A & B;            // Z[0] = 1 if A = 1 and B = 1
assign Z[1] = A | B;            // Z[1] = 1 if A = 1 or B = 1
assign Z[2] = A ^ B;            // Z[2] = 1 if A = 1 and B = 0 or A = 0 and B = 1
assign Z[3] = ~(A & B);         // Z[3] = 1 if A = 0 and B = 0
endmodule
