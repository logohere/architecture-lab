`timescale 1ns/1ps
module arithmetic_engine_tb;
    logic clk = 0;
    always #5 clk = ~clk;
    logic rst = 1, in_valid = 0, in_last = 0, out_ready = 0;
    logic [1:0] in_opcode = 0;
    logic [5:0] in_left = 0, in_right = 0;
    logic [31:0] in_literal = 0;
    wire in_ready, out_valid, out_error;
    wire [31:0] out_value;
    wire [6:0] out_nodes;

    arithmetic_engine dut (.*);

    task automatic send(input logic [1:0] op, input logic [5:0] a,
                        input logic [5:0] b, input logic [31:0] literal,
                        input logic last);
        @(negedge clk);
        if (in_ready !== 1'b1) $fatal(1, "input unexpectedly blocked");
        in_opcode = op;
        in_left = a;
        in_right = b;
        in_literal = literal;
        in_last = last;
        in_valid = 1;
        @(negedge clk);
        in_valid = 0;
    endtask

    task automatic check_result(input logic error, input logic [31:0] expected,
                                input logic [6:0] nodes);
        if (out_valid !== 1'b1 || out_error !== error ||
            out_value !== expected || out_nodes !== nodes || in_ready !== 1'b0)
            $fatal(1, "result mismatch");
        // Backpressure: input must remain blocked and result unchanged.
        in_valid = 1;
        in_opcode = 0;
        in_literal = 32'hdeadbeef;
        in_last = 1;
        repeat (3) begin
            @(negedge clk);
            if (out_valid !== 1'b1 || out_error !== error ||
                out_value !== expected || out_nodes !== nodes || in_ready !== 1'b0)
                $fatal(1, "result changed while stalled");
        end
        in_valid = 0;
        out_ready = 1;
        @(negedge clk);
        out_ready = 0;
        if (out_valid !== 1'b0 || in_ready !== 1'b1) $fatal(1, "failed to retire result");
    endtask

    task automatic reset_core;
        @(negedge clk);
        rst = 1;
        @(negedge clk);
        rst = 0;
        #1;
        if (out_valid !== 1'b0 || in_ready !== 1'b1) $fatal(1, "reset failed");
    endtask

    integer fd, count, cases, i, j, op, a, b;
    logic [31:0] literal, expected;
    string vectors;

    initial begin
        if (!$value$plusargs("vectors=%s", vectors)) $fatal(1, "missing vectors");
        fd = $fopen(vectors, "r");
        if (fd == 0 || $fscanf(fd, "%d", cases) != 1 || cases < 1) $fatal(1, "bad vectors");
        reset_core();
        for (i = 0; i < cases; i = i + 1) begin
            if ($fscanf(fd, "%d %h", count, expected) != 2 || count < 1 || count > 64)
                $fatal(1, "bad case");
            for (j = 0; j < count; j = j + 1) begin
                if ($fscanf(fd, "%d %d %d %h", op, a, b, literal) != 4)
                    $fatal(1, "bad node");
                send(op[1:0], a[5:0], b[5:0], literal, j == count - 1);
            end
            check_result(0, expected, count[6:0]);
        end
        $fclose(fd);
        // Invalid opcode, forward edge, repeated operand, disconnected graph.
        send(3, 0, 0, 0, 1); check_result(1, 0, 0);
        send(1, 0, 1, 0, 1); check_result(1, 0, 0);
        send(0, 0, 0, 1, 0); send(1, 0, 0, 0, 1); check_result(1, 0, 0);
        send(0, 0, 0, 1, 0); send(0, 0, 0, 2, 1); check_result(1, 0, 0);
        // An already consumed operand cannot be reused.
        send(0, 0, 0, 1, 0); send(0, 0, 0, 2, 0);
        send(1, 0, 1, 0, 0); send(2, 0, 2, 0, 1); check_result(1, 0, 0);
        for (j = 0; j < 64; j = j + 1) send(0, 0, 0, 1, 0);
        check_result(1, 0, 0);
        // Consecutive accepted beats without idle cycles.
        @(negedge clk);
        in_valid = 1; in_opcode = 0; in_literal = 6; in_last = 0;
        @(negedge clk);
        if (!in_ready) $fatal(1, "burst stalled");
        in_literal = 7;
        @(negedge clk);
        if (!in_ready) $fatal(1, "burst stalled");
        in_opcode = 2; in_left = 0; in_right = 1; in_last = 1;
        @(negedge clk);
        in_valid = 0;
        check_result(0, 42, 3);
        // Reset during a partial graph and while a result is pending.
        send(0, 0, 0, 9, 0); reset_core();
        send(0, 0, 0, 42, 1); reset_core();
        send(0, 0, 0, 7, 1); check_result(0, 7, 1);
        $display("PASS %0d public RTL vectors, negative controls, reset and backpressure", cases);
        $finish;
    end

    initial begin
        #100000;
        $fatal(1, "simulation timeout");
    end
endmodule
