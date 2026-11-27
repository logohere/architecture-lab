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

    // Sample the public interface before the edge and inspect registered outputs
    // after nonblocking assignments. No DUT internals or physical timing assumed.
    integer cycle = 0, first_cycle, accepted = 0, idle = 0, stalled = 0;
    integer result_cycles, done_accepted, done_idle, done_stalled;
    integer done_result_cycles, done_retire_cycles;
    logic was_reset, was_pending, was_ready, was_accepted, was_last;
    logic old_error;
    logic [31:0] old_value;
    logic [6:0] old_nodes;

    always @(posedge clk) begin
        cycle = cycle + 1;
        was_reset = rst;
        was_pending = out_valid;
        was_ready = out_ready;
        was_accepted = in_valid && in_ready;
        was_last = in_last;
        old_error = out_error;
        old_value = out_value;
        old_nodes = out_nodes;
        if (in_ready !== (!rst && !out_valid))
            $fatal(1, "protocol: incorrect input readiness");
        if (was_reset) begin
            accepted = 0; idle = 0; stalled = 0;
        end else if (was_pending) begin
            if (was_accepted) $fatal(1, "protocol: accepted input while output pending");
            if (was_ready) begin
                done_accepted = accepted;
                done_idle = idle;
                done_stalled = stalled;
                done_result_cycles = result_cycles;
                done_retire_cycles = cycle - first_cycle + 1;
                accepted = 0; idle = 0; stalled = 0;
            end else stalled = stalled + 1;
        end else if (was_accepted) begin
            if (accepted == 0) first_cycle = cycle;
            accepted = accepted + 1;
        end else if (accepted != 0) idle = idle + 1;

        #1;
        if (in_ready !== (!rst && !out_valid))
            $fatal(1, "protocol: incorrect input readiness after edge");
        if (was_reset) begin
            if ({out_valid, out_error, out_value, out_nodes} !== 41'd0)
                $fatal(1, "protocol: reset did not clear output");
        end else if (was_pending && !was_ready) begin
            if ({out_valid, out_error, out_value, out_nodes} !== {1'b1, old_error, old_value, old_nodes})
                $fatal(1, "protocol: output changed under backpressure");
        end else if (was_pending && was_ready) begin
            if (out_valid !== 1'b0) $fatal(1, "protocol: result did not retire");
        end else if (!was_accepted) begin
            if (out_valid !== 1'b0) $fatal(1, "protocol: unsolicited output");
        end else begin
            if (was_last && out_valid !== 1'b1)
                $fatal(1, "protocol: missing final-beat result");
            if (out_valid) begin
                result_cycles = cycle - first_cycle + 1;
                if (out_error === 1'b1) begin
                    if ({out_value, out_nodes} !== 39'd0)
                        $fatal(1, "protocol: malformed error result");
                end else if (out_error !== 1'b0 || out_nodes !== accepted[6:0])
                    $fatal(1, "protocol: incorrect successful beat count");
            end
        end
    end

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
    integer ops [0:63], lefts [0:63], rights [0:63];
    logic [31:0] literals [0:63];
    integer mode;

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
                ops[j] = op; lefts[j] = a; rights[j] = b; literals[j] = literal;
            end
            // Replay each workload without gaps and with exactly two idle edges
            // between beats. Both modes retain the same output backpressure.
            for (mode = 0; mode < 2; mode = mode + 1) begin
                @(negedge clk);
                for (j = 0; j < count; j = j + 1) begin
                    if (in_ready !== 1'b1) $fatal(1, "timing: input unexpectedly blocked");
                    in_opcode = ops[j][1:0];
                    in_left = lefts[j][5:0];
                    in_right = rights[j][5:0];
                    in_literal = literals[j];
                    in_last = j == count - 1;
                    in_valid = 1;
                    @(negedge clk);
                    if (mode == 1 && j < count - 1) begin
                        in_valid = 0;
                        repeat (2) @(negedge clk);
                    end
                end
                in_valid = 0;
                check_result(0, expected, count[6:0]);
                $display("TIMING,%0d,%0d,%0d,%0d,%0d,%0d,%0d", i, mode,
                    done_accepted, done_idle, done_stalled, done_result_cycles, done_retire_cycles);
            end
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
