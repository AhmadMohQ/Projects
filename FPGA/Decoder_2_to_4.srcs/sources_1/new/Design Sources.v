`timescale 1ns / 1ps
//////////////////////////////////////////////////////////////////////////////////
// Company: 
// Engineer: 
// 
// Create Date: 01/27/2025 12:59:44 PM
// Design Name: 
// Module Name: Design Sources
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


module Design_Sources(
    input [2:0] sw,
    output [3:0] led
    );
    Decoder_2_to_4 uut (
        .w0(sw[0]),
        .w1(sw[1]),
        .En(sw[2]),
        .y0(led[0]),
        .y1(led[1]),
        .y2(led[2]),
        .y3(led[3])
        );
    
    


endmodule
