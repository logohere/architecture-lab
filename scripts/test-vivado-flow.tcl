# Test-only Vivado command doubles: no EDA tool or hardware is invoked.
# Source the actual batch script in a disposable fixture repository.
set flow [lindex $argv 0]
set argv [lrange $argv 1 end]
proc version {args} { return test-double }
proc set_param {args} {}
proc read_verilog {args} {}
proc read_xdc {args} {}
proc synth_design {args} {}
proc opt_design {args} {}
proc place_design {args} {}
proc route_design {} {
    if {$::env(ARCHLAB_TEST_FAILURE) eq "route"} { error "injected route failure" }
}
proc fake_report {args} {
    set f [open [lindex $args end] w]
    puts $f "TEST DOUBLE - NOT HARDWARE EVIDENCE"
    close $f
}
foreach cmd {write_checkpoint report_utilization report_route_status report_timing_summary report_drc} {
    interp alias {} $cmd {} fake_report
}
proc get_clocks {args} { return core_clk }
proc get_timing_paths {args} { return test_path }
proc get_property {args} {
    if {$::env(ARCHLAB_TEST_FAILURE) eq "slack"} { return -0.25 }
    return 0.25
}
source $flow
