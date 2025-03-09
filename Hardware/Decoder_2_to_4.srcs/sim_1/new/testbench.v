`timescale 1ns / 1ps
//////////////////////////////////////////////////////////////////////////////////
// Company: 
// Engineer: 
// 
// Create Date: 01/27/2025 12:05:26 PM
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

//Name: Ahmad Mohamad
//Student ID: 101230403

module testbench();

    reg Inw0;
    reg Inw1;
    reg InEn;
    wire Outy0;  
    wire Outy1;  
    wire Outy2;  
    wire Outy3;  

    Decoder_2_to_4 uut (
        .w0(Inw0),
        .w1(Inw1),
        .En(InEn),
        .y0(Outy0),
        .y1(Outy1),   
        .y2(Outy2),
        .y3(Outy3));
        
    initial begin
        InEn = 0; Inw0 = 0; Inw1 = 0; #10;
        InEn = 1; Inw0 = 0; Inw1 = 0; #10;
        InEn = 1; Inw0 = 0; Inw1 = 1; #10;
        InEn = 1; Inw0 = 1; Inw1 = 0; #10;   
        InEn = 1; Inw0 = 1; Inw1 = 1; #10;
        $finish;
    end
    
    
endmodule






