`timescale 1ns / 1ps
//////////////////////////////////////////////////////////////////////////////////
// Company: 
// Engineer: 
// 
// Create Date: 01/13/2025 01:05:41 PM
// Design Name: 
// Module Name: testbench
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
//Ahmad Mohamad
//101230403

module testbench();

    reg a, b; // Single bit inputs
    wire [3:0] z; // 4-bit output

LogicGates uut (
    .A(a),
    .B(b),
    .Z(z)
);
    
initial begin
   //initil inputs
   a = 0;
   b = 0;
        
   //wait for time period
   #10;
        
   //Apply different test cases
   a = 0; b = 0; #10;
   a = 0; b = 1; #10;
   a = 1; b = 0; #10;
   a = 1; b = 1; #10;
        
   //finish simulatio
   $finish;
        
    end
endmodule
