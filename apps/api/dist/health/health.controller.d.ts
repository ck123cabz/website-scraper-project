export declare class HealthController {
    private readonly startTime;
    constructor();
    getHealth(): {
        status: string;
        timestamp: string;
        uptime: number;
        environment: string;
    };
}
