interface Server {
    id: number,
    ip: string
}

interface Service {
    id: number,
    name: string
}

interface Job {
    id: number
}

interface ServiceData {
    id: number,
    name: string,
}

export class PingTemplate {
    messageType: number;
    server: Server;
    status: string;
    pingInfo: string[];

    constructor(serverId: number, ip: string, status: string, pingInfo: string[]) {
        this.messageType = 1;
        this.server = { id: serverId, ip };
        this.status = status;
        this.pingInfo = pingInfo;
    }
}

export class ServiceTestTemplate {
    messageType: number;
    service: Service;
    server: Server;
    job: Job;
    status: string[];

    constructor(serviceId: number, serviceName: string, serverId: number, ip: string, jobId: number, status: string[]) {
        this.messageType = 2;
        this.service = { id: serviceId, name: serviceName };
        this.server = { id: serverId, ip };
        this.job = { id: jobId };
        this.status = status;
    }
}

// PFSENSE
// MESSAGE TYPE 3

export class ServiceDataTemplate {
    messageType: number;
    serviceData: ServiceData;
    value: number | string;
    status: string[];

    constructor(serviceDataId: number, serviceDataName: string, value: number | string, status: string[]) {
        this.messageType = 4;
        this.serviceData = { id: serviceDataId, name: serviceDataName };
        this.value = value;
        this.status = status;
    }
}