<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('username')->unique();
            $table->string('password');
            $table->enum('registration_source', ['friend', 'social_media', 'advertisement']);
            $table->boolean('has_played')->default(false);
            $table->boolean('accept_terms');
            $table->rememberToken();
            $table->timestamps();
        });

        Schema::create('games', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->timestamp('start_time');
            $table->timestamp('end_time')->nullable();
            $table->enum('status', ['in_progress', 'completed'])->default('in_progress');
            $table->integer('total_shots')->default(0);
            $table->integer('hits')->default(0);
            $table->integer('misses')->default(0);
            $table->integer('score')->default(0);
            $table->timestamps();
        });

        Schema::create('ships', function (Blueprint $table) {
            $table->id();
            $table->foreignId('game_id')->constrained()->onDelete('cascade');
            $table->enum('type', ['destroyer', 'submarine', 'cruiser', 'battleship', 'carrier']);
            $table->integer('position_x');
            $table->integer('position_y');
            $table->enum('orientation', ['horizontal', 'vertical']);
            $table->integer('size');
            $table->integer('hits')->default(0);
            $table->boolean('sunk')->default(false);
            $table->timestamps();
        });

        Schema::create('shots', function (Blueprint $table) {
            $table->id();
            $table->foreignId('game_id')->constrained()->onDelete('cascade');
            $table->integer('position_x');
            $table->integer('position_y');
            $table->boolean('hit');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('shots');
        Schema::dropIfExists('ships');
        Schema::dropIfExists('games');
        Schema::dropIfExists('users');
    }
};