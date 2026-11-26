# Local, non-project implementation of the fixed baseline.
proc write_text {path contents} {
    set f [open $path w]
    try {
        puts $f $contents
    } finally {
        close $f
    }
}

proc sha256 {path} {
    return [exec node -e {const f=require("node:fs");const c=require("node:crypto");console.log(c.createHash("sha256").update(f.readFileSync(process.argv[1])).digest("hex"))} $path]
}

proc implement {dir} {
    set part xc7z007sclg400-1
    set_param general.maxThreads 4
    read_verilog -sv [file join $dir arithmetic_engine.sv]
    read_xdc [file join $dir clock.xdc]
    write_text [file join $dir stage.txt] synthesis
    synth_design -top arithmetic_engine -part $part -mode out_of_context
    write_checkpoint [file join $dir synth.dcp]
    report_utilization -file [file join $dir synth-utilization.rpt]
    write_text [file join $dir stage.txt] placement
    opt_design
    place_design
    write_checkpoint [file join $dir placed.dcp]
    write_text [file join $dir stage.txt] routing
    route_design
    write_checkpoint [file join $dir routed.dcp]
    write_text [file join $dir stage.txt] reporting
    report_utilization -file [file join $dir routed-utilization.rpt]
    report_route_status -file [file join $dir route-status.rpt]
    report_timing_summary -delay_type min_max -report_unconstrained -check_timing_verbose -file [file join $dir timing.rpt]
    report_drc -file [file join $dir drc.rpt]
    set clk [get_clocks core_clk]
    if {[llength $clk] != 1} { error "Missing or ambiguous core clock" }
    foreach {kind delay} {setup max hold min} {
        set paths [get_timing_paths -from $clk -to $clk -delay_type $delay -max_paths 1 -no_report_unconstrained]
        if {[llength $paths] != 1} { error "Missing constrained $kind path" }
        set slack [get_property SLACK [lindex $paths 0]]
        if {![regexp {^-?[0-9]+(\.[0-9]+)?$} $slack]} { error "Invalid $kind slack" }
        write_text [file join $dir ${kind}-slack-ns.txt] $slack
    }
    foreach kind {setup hold} {
        set f [open [file join $dir ${kind}-slack-ns.txt] r]
        set slack [string trim [read $f]]
        close $f
        if {$slack < 0} { error "Negative internal $kind slack" }
    }
    write_text [file join $dir stage.txt] complete
}

proc main {args} {
    if {[llength $args] != 1} { error "Usage: vivado -mode batch -source fpga/vivado/ooc.tcl -tclargs CLOCK_NS" }
    set period [lindex $args 0]
    if {![regexp {^[1-9][0-9]{0,3}(\.[0-9]{1,3})?$} $period] || $period > 1000} {
        error "Clock period must be a decimal number from 1 to 1000 ns"
    }
    set script [file normalize [info script]]
    set root [file dirname [file dirname [file dirname $script]]]
    if {[info exists ::env(USERPROFILE)]} {
        set home $::env(USERPROFILE)
    } else {
        set home $::env(HOME)
    }
    # One implementation at a time across this user's worktrees.
    set lock [file join $home .architecture-lab-vivado.lock]
    if {[catch {open $lock {WRONLY CREAT EXCL}} handle]} {
        error "Cannot acquire Vivado lock: $lock (check for a live or interrupted run)"
    }
    set dir ""
    try {
        puts $handle [pid]
        close $handle
        set run_id [clock format [clock seconds] -gmt 1 -format %Y%m%dT%H%M%SZ]-[pid]
        set parent [file join $root experiments runs]
        file mkdir $parent
        set dir [file join $parent $run_id]
        if {[file exists $dir]} {
            set dir ""
            error "Run directory already exists"
        }
        file mkdir $dir
        write_text [file join $dir stage.txt] preparing
        file copy [file join $root rtl arithmetic_engine.sv] [file join $dir arithmetic_engine.sv]
        file copy $script [file join $dir ooc.tcl]
        write_text [file join $dir clock.xdc] "create_clock -name core_clk -period $period \[get_ports clk\]"
        set manifest [list "schema\t1" "part\txc7z007sclg400-1" "top\tarithmetic_engine" "clock_ns\t$period" "max_threads\t4" "vivado\t[version -short]" "git_commit\t[exec git -C $root rev-parse HEAD]"]
        lappend manifest "tracked_dirty\t[expr {[exec git -C $root status --porcelain --untracked-files=no] ne ""}]"
        foreach name {arithmetic_engine.sv ooc.tcl clock.xdc} {
            lappend manifest "$name.sha256\t[sha256 [file join $dir $name]]"
        }
        write_text [file join $dir manifest.tsv] [join $manifest "\n"]
        # Native reports and stage/error markers are retained even on failure.
        implement $dir
        write_text [file join $dir status.txt] reports_ready_for_review
        puts "Reports: $dir"
    } on error {message options} {
        if {$dir ne "" && [file isdirectory $dir]} {
            write_text [file join $dir status.txt] failed
            write_text [file join $dir error.txt] $message
            puts stderr "Failure evidence: $dir"
        }
        return -options $options $message
    } finally {
        file delete $lock
    }
}

if {[catch {main {*}$argv} message]} {
    puts stderr $message
    exit 1
}
exit 0
