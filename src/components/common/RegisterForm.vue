<template>
  <Card class="w-96">
    <CardHeader>
      <CardTitle>Register</CardTitle>
      <CardDescription> Please enter your credentials to create an account. </CardDescription>
    </CardHeader>
    <CardContent>
      <form>
        <div class="flex flex-col gap-4">
          <div class="flex flex-col gap-2">
            <Label for="username">Username</Label>
            <Input id="username" type="text" placeholder="Username" class="w-full" />
          </div>
          <div class="flex flex-col gap-2">
            <Label for="email">Email</Label>
            <Input id="email" type="text" placeholder="Email" class="w-full" />
          </div>
          <div class="flex flex-col gap-2">
            <Label for="password">Password</Label>
            <Input id="password" type="password" placeholder="Password" class="w-full" />
          </div>
          <Button type="submit" class="w-full">Register</Button>
        </div>
      </form>
    </CardContent>
    <CardFooter>
      <div class="flex flex-col gap-2 w-full">
        <Button variant="outline" class="w-full">Login</Button>
      </div>
    </CardFooter>
  </Card>
</template>

<script setup lang="ts">
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Input from '../ui/input/Input.vue'
import Label from '../ui/label/Label.vue'
</script>
