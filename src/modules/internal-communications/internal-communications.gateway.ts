import {
    WebSocketGateway,
    WebSocketServer,
    OnGatewayInit,
    OnGatewayConnection,
    OnGatewayDisconnect,
    SubscribeMessage,
} from '@nestjs/websockets';
import path from 'path';
import { Server, Socket } from 'socket.io';
import { InternalCommunicationsService } from './communications.service';
import { CreateInternalCommunicationDto } from './dtos/create-internal-communication.dto';

@WebSocketGateway(
    {
        cors: {
            origin: '*',

        },
    })
export class InternalCommunicationsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer() server: Server;

    constructor(private readonly internalCommunicationsService: InternalCommunicationsService) { }

    afterInit(server: Server) {
        console.log('WebSocket Server Initialized');
    }

    handleConnection(client: Socket) {
        console.log(`Client connected: ${client.id}`);
    }

    handleDisconnect(client: Socket) {
        console.log(`Client disconnected: ${client.id}`);
    }

    @SubscribeMessage('sendCommunication')
    async handleSendCommunication(client: Socket, payload: CreateInternalCommunicationDto) {
        const communication = await this.internalCommunicationsService.create(payload);
        this.server.to(payload.department_id).emit('receiveCommunication', communication);
    }

    @SubscribeMessage('joinDepartment')
    handleJoinDepartment(client: Socket, body: { department_id: string }) {
        client.join(body.department_id);
        console.log(`Client joined department: ${body.department_id}`);
    }
}
