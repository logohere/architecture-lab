// Fixed single-lane streaming baseline. No physical timing claims.
module arithmetic_engine (
    input  logic        clk,
    input  logic        rst,
    input  logic        in_valid,
    output logic        in_ready,
    input  logic [1:0]  in_opcode,
    input  logic [5:0]  in_left,
    input  logic [5:0]  in_right,
    input  logic [31:0] in_literal,
    input  logic        in_last,
    output logic        out_valid,
    input  logic        out_ready,
    output logic        out_error,
    output logic [31:0] out_value,
    output logic [6:0]  out_nodes
);
    localparam logic [1:0] LITERAL = 2'd0, ADD = 2'd1, MUL = 2'd2;
    logic [31:0] values [0:63];
    logic [63:0] consumed;
    logic [5:0] index;
    logic [6:0] consumed_count;
    logic valid_node;
    logic [31:0] value;
    logic [6:0] next_consumed;

    assign in_ready = !rst && !out_valid;

    always_comb begin
        valid_node = 1'b0;
        value = 32'd0;
        next_consumed = consumed_count;
        case (in_opcode)
            LITERAL: begin
                valid_node = 1'b1;
                value = in_literal;
            end
            ADD, MUL: begin
                if (in_left < index && in_right < index &&
                    in_left != in_right && !consumed[in_left] && !consumed[in_right]) begin
                    valid_node = 1'b1;
                    next_consumed = consumed_count + 7'd2;
                    if (in_opcode == ADD)
                        value = values[in_left] + values[in_right];
                    else
                        value = values[in_left] * values[in_right];
                end
            end
            default: valid_node = 1'b0;
        endcase
    end

    always_ff @(posedge clk) begin
        if (rst) begin
            index <= 6'd0;
            consumed <= 64'd0;
            consumed_count <= 7'd0;
            out_valid <= 1'b0;
            out_error <= 1'b0;
            out_value <= 32'd0;
            out_nodes <= 7'd0;
        end else if (out_valid) begin
            if (out_ready) begin
                out_valid <= 1'b0;
                index <= 6'd0;
                consumed <= 64'd0;
                consumed_count <= 7'd0;
            end
        end else if (in_valid && in_ready) begin
            if (!valid_node || (in_last && next_consumed != {1'b0, index}) ||
                (!in_last && index == 6'd63)) begin
                out_valid <= 1'b1;
                out_error <= 1'b1;
                out_value <= 32'd0;
                out_nodes <= 7'd0;
            end else if (in_last) begin
                out_valid <= 1'b1;
                out_error <= 1'b0;
                out_value <= value;
                out_nodes <= {1'b0, index} + 7'd1;
            end else begin
                values[index] <= value;
                index <= index + 6'd1;
                consumed_count <= next_consumed;
                if (in_opcode != LITERAL) begin
                    consumed[in_left] <= 1'b1;
                    consumed[in_right] <= 1'b1;
                end
            end
        end
    end
endmodule
