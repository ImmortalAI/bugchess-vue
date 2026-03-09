<template>
  <Card class="w-96">
    <CardHeader>
      <CardTitle>Login</CardTitle>
      <CardDescription> Please enter your credentials to log in to your account. </CardDescription>
    </CardHeader>
    <CardContent>
      <form>
        <div class="flex flex-col gap-4">
          <div class="flex flex-col gap-2">
            <Label for="email">Email</Label>
            <Input id="email" type="text" placeholder="Email" class="w-full" />
          </div>
          <div class="flex flex-col gap-2">
            <Label for="password">Password</Label>
            <Input id="password" type="password" placeholder="Password" class="w-full" />
          </div>
          <Button type="submit" class="w-full">Login</Button>
        </div>
      </form>
    </CardContent>
    <CardFooter>
      <div class="flex flex-col gap-2 w-full">
        <Button variant="outline" class="w-full">Register</Button>
        <Button variant="link" class="w-full">Forget Password?</Button>
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
