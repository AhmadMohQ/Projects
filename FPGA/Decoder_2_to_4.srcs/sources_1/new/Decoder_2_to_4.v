`timescale 1ns / 1ps
//////////////////////////////////////////////////////////////////////////////////
// Company: 
// Engineer: 
// 
// Create Date: 01/27/2025 11:51:49 AM
// Design Name: 
// Module Name: Decoder_2_to_4
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

//Name: Ahmad Mohamad
//Student ID: 101230403

module Decoder_2_to_4(
    input w0,
    input w1,
    input En,
    output y0,
    output y1,
    output y2,
    output y3);
    
    assign y3 = En & w1 & w0;
    assign y2 = En & w1 & !w0;
    assign y1 = En & !w1 & w0;
    assign y0 = En & !w1 & !w0;
    
endmodule
